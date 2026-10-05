/**
 * Releases the version packages/offprompt/package.json declares, in three parts that each
 * happen once: the package on npm, a GitHub release with the version's changelog entry, and
 * the server in the MCP Registry. `pending` says which are due, so a run that stopped partway
 * finishes the rest when run again. The release workflow runs it on main, where npm and the
 * registry trust it through GitHub's OIDC, so no token is stored.
 *
 *   pending              which parts are due, handed to the workflow's next steps
 *   npm [--dry-run]      assembles the package and publishes it; --dry-run shows what would go
 *   github               opens the GitHub release
 *   wait-for-npm         waits until npm serves the version, which the registry looks up
 */
import { execFile, spawn } from 'node:child_process'
import { appendFile, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { setTimeout as sleep } from 'node:timers/promises'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

const root = fileURLToPath(new URL('../', import.meta.url))

const { version } = JSON.parse(await readFile(join(root, 'packages/offprompt/package.json'), 'utf8'))

const { name: serverName } = JSON.parse(await readFile(join(root, 'server.json'), 'utf8'))

const tag = `v${version}`

const [command, ...flags] = process.argv.slice(2)

const dryRun = flags.includes('--dry-run')

/** How long npm may take to serve a version it has just taken: its registry caches for minutes. */
const NPM_PATIENCE_MS = 20 * 60_000

/** Runs a command in the repository with its output shown, and fails when it does. */
const run = (program, args) =>
  new Promise((resolve, reject) => {
    const child = spawn(program, args, { cwd: root, stdio: 'inherit' })
    child.once('error', reject)
    child.once('close', code =>
      code === 0 ? resolve() : reject(new Error(`${program} ${args.join(' ')} exited with ${String(code)}`)),
    )
  })

/** Whether a command succeeds, its output unseen. */
const succeeds = (program, args) =>
  promisify(execFile)(program, args, { cwd: root }).then(
    () => true,
    () => false,
  )

/** Hands a value to the workflow's next steps, or prints it when run by hand. */
const output = (key, value) =>
  process.env.GITHUB_OUTPUT === undefined
    ? Promise.resolve(void process.stdout.write(`${key}=${value}\n`))
    : appendFile(process.env.GITHUB_OUTPUT, `${key}=${value}\n`)

/** Whether npm serves this version, asked of the registry itself, past any cached answer. */
const onNpm = () =>
  globalThis.fetch(`https://registry.npmjs.org/offprompt/${version}?at=${String(Date.now())}`).then(
    response => response.ok,
    () => false,
  )

/** The repository's GitHub releases: the workflow's own, or wherever `gh` points by hand. */
const repository = process.env.GITHUB_REPOSITORY === undefined ? [] : ['--repo', process.env.GITHUB_REPOSITORY]

const released = () => succeeds('gh', ['release', 'view', tag, ...repository])

const listed = () =>
  globalThis.fetch(`https://registry.modelcontextprotocol.io/v0.1/servers/${encodeURIComponent(serverName)}/versions/${version}`).then(
    response => response.ok,
    () => false,
  )

/** The changelog's entry for this version: everything under its heading, up to the next one. */
const notes = async () => {
  const changelog = await readFile(join(root, 'packages/offprompt/CHANGELOG.md'), 'utf8')
  const [, entry = ''] = changelog.split(new RegExp(`^## ${version.replaceAll('.', '\\.')}$`, 'm'))
  const [body = ''] = entry.split(/^## /m)
  if (body.trim() === '') throw new Error(`CHANGELOG.md has no entry for ${version}`)
  return body.trim()
}

/** Runs a step with a folder of its own, gone afterwards. */
const inScratch = async step => {
  const work = await mkdtemp(join(tmpdir(), 'offprompt-release-'))
  try {
    return await step(work)
  } finally {
    await rm(work, { recursive: true, force: true })
  }
}

const pending = async () => {
  const [npm, github, registry] = await Promise.all([onNpm(), released(), listed()])
  process.stdout.write(
    `offprompt ${version}: ${npm ? 'on' : 'not on'} npm, ${github ? 'a' : 'no'} GitHub release, ${registry ? 'listed' : 'not listed'} in the MCP Registry\n`,
  )
  await output('version', version)
  await output('npm', String(!npm))
  await output('github', String(!github))
  await output('registry', String(!registry))
}

/**
 * npm's answer to a version it has taken already. It holds a new version for minutes before
 * serving it, and a run in that time finds it missing and publishes it again.
 */
const PUBLISHED_ALREADY = /cannot publish over the previously published version/i

/** Publishes the assembled package, and counts npm having it already as done. */
const npmPublish = assembled =>
  promisify(execFile)('npm', ['publish', assembled, '--access', 'public', ...(dryRun ? ['--dry-run'] : [])], { cwd: root }).then(
    ({ stdout, stderr }) => void process.stdout.write(`${stdout}${stderr}`),
    error => {
      const said = `${String(error.stdout ?? '')}${String(error.stderr ?? '')}`
      if (!PUBLISHED_ALREADY.test(said)) throw error
      process.stdout.write(`npm has offprompt ${version} already, still being processed\n`)
    },
  )

const publishToNpm = async () => {
  if (await onNpm()) throw new Error(`npm has offprompt ${version} already`)
  await notes()
  await inScratch(async work => {
    const assembled = join(work, 'offprompt')
    await run('pnpm', ['package', assembled])
    await npmPublish(assembled)
  })
  if (dryRun) process.stdout.write(`\nThe GitHub release ${tag} would say:\n\n${await notes()}\n`)
}

const openRelease = async () => {
  const entry = await notes()
  await inScratch(async work => {
    const notesFile = join(work, 'notes.md')
    await writeFile(notesFile, `${entry}\n`)
    await run('gh', [
      'release',
      'create',
      tag,
      ...repository,
      '--target',
      process.env.GITHUB_SHA ?? 'main',
      '--title',
      tag,
      '--notes-file',
      notesFile,
    ])
  })
}

const waitForNpm = async (deadline = Date.now() + NPM_PATIENCE_MS) => {
  if (await onNpm()) return
  if (Date.now() > deadline) throw new Error(`npm did not serve offprompt ${version} in time`)
  process.stdout.write(`npm does not serve offprompt ${version} yet\n`)
  await sleep(20_000)
  await waitForNpm(deadline)
}

const COMMANDS = { pending, npm: publishToNpm, github: openRelease, 'wait-for-npm': () => waitForNpm() }

if (command === undefined || !(command in COMMANDS)) {
  process.stderr.write('usage: node scripts/release.mjs pending | npm [--dry-run] | github | wait-for-npm\n')
  process.exit(1)
}

await COMMANDS[command]()
