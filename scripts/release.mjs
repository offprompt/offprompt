/**
 * Releases the version packages/offprompt/package.json declares, once npm does not have it.
 * `pending` says whether it is due. `publish` assembles the package, publishes it to npm and
 * opens a GitHub release with the version's changelog entry; `publish --dry-run` does neither
 * and shows what would go out. The release workflow runs both on main, where npm trusts it
 * through GitHub's OIDC, so no token is stored. Each hands what it found to the steps after it.
 */
import { execFile, spawn } from 'node:child_process'
import { appendFile, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

const root = fileURLToPath(new URL('../', import.meta.url))

const { version } = JSON.parse(await readFile(join(root, 'packages/offprompt/package.json'), 'utf8'))

const tag = `v${version}`

const [command, ...flags] = process.argv.slice(2)

const dryRun = flags.includes('--dry-run')

/** Runs a command in the repository with its output shown, and fails when it does. */
const run = (program, args) =>
  new Promise((resolve, reject) => {
    const child = spawn(program, args, { cwd: root, stdio: 'inherit' })
    child.once('error', reject)
    child.once('close', code =>
      code === 0 ? resolve() : reject(new Error(`${program} ${args.join(' ')} exited with ${String(code)}`)),
    )
  })

/** Hands a value to the workflow's next steps, or prints it when run by hand. */
const output = (name, value) =>
  process.env.GITHUB_OUTPUT === undefined
    ? Promise.resolve(void process.stdout.write(`${name}=${value}\n`))
    : appendFile(process.env.GITHUB_OUTPUT, `${name}=${value}\n`)

/** Whether npm has this version of offprompt. It says nothing for a version it lacks. */
const onNpm = () =>
  promisify(execFile)('npm', ['view', `offprompt@${version}`, 'version']).then(
    ({ stdout }) => stdout.trim() === version,
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

const pending = async () => {
  const published = await onNpm()
  process.stdout.write(`offprompt ${version} ${published ? 'is on npm already' : 'is not on npm yet'}\n`)
  await output('due', String(!published))
  await output('version', version)
}

const publish = async () => {
  if (await onNpm()) throw new Error(`offprompt ${version} is on npm already`)
  const entry = await notes()
  const work = await mkdtemp(join(tmpdir(), 'offprompt-release-'))
  try {
    const assembled = join(work, 'offprompt')
    await run('pnpm', ['package', assembled])
    await run('npm', ['publish', assembled, '--access', 'public', ...(dryRun ? ['--dry-run'] : [])])
    const notesFile = join(work, 'notes.md')
    await writeFile(notesFile, `${entry}\n`)
    if (dryRun) {
      process.stdout.write(`\nThe GitHub release ${tag} would say:\n\n${entry}\n`)
      return
    }
    await run('gh', ['release', 'create', tag, '--target', process.env.GITHUB_SHA ?? 'main', '--title', tag, '--notes-file', notesFile])
    await output('published', 'true')
  } finally {
    await rm(work, { recursive: true, force: true })
  }
}

const COMMANDS = { pending, publish }

if (!(command in COMMANDS)) {
  process.stderr.write('usage: node scripts/release.mjs pending | publish [--dry-run]\n')
  process.exit(1)
}

await COMMANDS[command]()
