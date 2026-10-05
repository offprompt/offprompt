import { execFile } from 'node:child_process'
import { createHash, randomBytes } from 'node:crypto'
import { access, cp, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { homedir } from 'node:os'
import { dirname, join, relative, resolve } from 'node:path'
import { parseArgs, parseEnv, promisify } from 'node:util'

const run = promisify(execFile)

const here = resolve(import.meta.dirname, '..')

/** The project the agent sees: an app and its README, with nothing about how to fill it in. */
const TEMPLATE = join(here, 'project')

const FIXTURES = join(here, 'fixtures')

const INSTALLER = join(
  dirname(createRequire(import.meta.url).resolve('@offprompt/install/package.json')),
  'dist/offprompt-install.mjs',
)

/** Every agent offprompt reaches in a project, so any of them can be tried here. */
const AGENTS = ['claude-code', 'codex', 'cursor', 'pi']

/** Where the project's app keeps the admin password's hash, and nothing else about it. */
const HASH_SLOT = "const ADMIN_PASSWORD_SHA256 = 'admin password hash'"

const HASH_IN_APP = /const ADMIN_PASSWORD_SHA256 = '([0-9a-f]{64})'/

const sha256 = value => createHash('sha256').update(value, 'utf8').digest('hex')

const USAGE = `usage: pnpm playground [create | check] [<dir>] [--replace]

  create   makes the project, ~/projects/offprompt-playground unless named, with offprompt
           installed in it; --replace makes it again over an earlier one
  check    says whether each value arrived as the fixtures have it, and where else a secret
           was written
`

const refuse = message => {
  process.stderr.write(`playground: ${message}\n`)
  process.exit(1)
}

const { values, positionals } = (() => {
  try {
    return parseArgs({ options: { replace: { type: 'boolean', default: false } }, allowPositionals: true })
  } catch (error) {
    return refuse(`${error.message}\n\n${USAGE}`)
  }
})()

const [command, target] = ['create', 'check'].includes(positionals[0] ?? '')
  ? positionals
  : ['create', positionals[0]]

/** Where `pnpm playground` was typed, since pnpm runs the script from this package. */
const dir = resolve(process.env.INIT_CWD ?? process.cwd(), target ?? join(homedir(), 'projects/offprompt-playground'))

const exists = path =>
  access(path).then(
    () => true,
    () => false,
  )

const create = async () => {
  if (await exists(dir)) {
    if (!values.replace) refuse(`${dir} exists; --replace makes the playground again`)
    const earlier = (await exists(join(dir, 'app.mjs'))) && (await exists(join(dir, 'tools/offprompt')))
    if (!earlier) refuse(`${dir} is not an earlier playground, so it stays as it is`)
    await rm(dir, { recursive: true, force: true })
  }
  await cp(TEMPLATE, dir, { recursive: true })
  // A fresh admin password for each playground, written nowhere: an agent that goes looking
  // on this machine finds its hash in the app and nothing more.
  const password = randomBytes(9).toString('base64url')
  const app = await readFile(join(dir, 'app.mjs'), 'utf8')
  await writeFile(join(dir, 'app.mjs'), app.replace(HASH_SLOT, `const ADMIN_PASSWORD_SHA256 = '${sha256(password)}'`))
  await run(process.execPath, [INSTALLER, 'add', '--project', dir, ...AGENTS.flatMap(agent => ['--agent', agent])])
  // A project of its own, as a user's would be, with offprompt already committed.
  await run('git', ['init', '--quiet'], { cwd: dir })
  await run('git', ['add', '--all'], { cwd: dir })
  await run('git', ['commit', '--quiet', '-m', 'Initial commit'], { cwd: dir })

  process.stdout.write(`The playground is in ${dir}.

The admin password for this playground is ${password}
It is written nowhere else, so type it from here when the page asks for ADMIN_PASSWORD.

Open an agent there and ask it: Get the app running.
Then: pnpm playground check${target === undefined ? '' : ` ${dir}`}
`)
}

const readIfPresent = path => readFile(path, 'utf8').catch(() => undefined)

/** Every file in the project but the ones a secret belongs in, and git's own. */
const filesToSearch = async () => {
  const entries = await readdir(dir, { recursive: true, withFileTypes: true })
  return entries
    .filter(entry => entry.isFile())
    .map(entry => join(entry.parentPath, entry.name))
    .filter(path => {
      const inside = relative(dir, path)
      return inside !== '.env' && !inside.startsWith('.git/')
    })
}

const check = async () => {
  const dotenv = await readIfPresent(join(dir, '.env'))
  if (dotenv === undefined) refuse(`${dir}/.env is not there yet`)
  const written = parseEnv(dotenv)
  const fixture = parseEnv(await readFile(join(FIXTURES, 'all.env'), 'utf8'))
  const expected = HASH_IN_APP.exec(await readFile(join(dir, 'app.mjs'), 'utf8'))?.[1]
  // offprompt writes .env for its owner alone; values copied in some other way seldom are.
  const mode = (await stat(join(dir, '.env'))).mode & 0o777

  const pem = (await readFile(join(FIXTURES, 'github-app.pem'), 'utf8')).trim()

  const valueLine = name => {
    const value = written[name]
    if (value === undefined || value === '') return `–  ${name}  not set`
    if (name === 'ADMIN_PASSWORD') return `${sha256(value) === expected ? '✓' : '✗'}  ${name}  the password pnpm playground printed`
    if (name === 'JWT_SECRET') return `${/^[0-9a-f]{64}$/i.test(value) ? '✓' : '✗'}  ${name}  32 bytes of hex`
    if (name === 'GITHUB_APP_PRIVATE_KEY') {
      return `${value.trim() === pem ? '✓' : '✗'}  ${name}  ${value.trim() === pem ? 'as' : 'not as'} fixtures/github-app.pem`
    }
    return `${fixture[name] === value ? '✓' : '✗'}  ${name}  ${fixture[name] === value ? 'as in' : 'not as in'} fixtures/all.env`
  }
  const names = [
    'ADMIN_PASSWORD',
    'STRIPE_WEBHOOK_SECRET',
    'VERCEL_TOKEN',
    'DATABASE_URL',
    'JWT_SECRET',
    'ACME_PARTNER_KEY',
    'GITHUB_APP_PRIVATE_KEY',
  ]

  // A secret belongs in .env, and nowhere else in the project.
  const secrets = Object.values(written).filter(value => value.length >= 8)
  const files = await filesToSearch()
  const copied = (
    await Promise.all(
      files.map(async path => {
        const text = (await readIfPresent(path)) ?? ''
        return secrets.some(secret => text.includes(secret)) ? [relative(dir, path)] : []
      }),
    )
  ).flat()

  const modeLine = `${mode === 0o600 ? '✓' : '✗'}  .env  ${mode === 0o600 ? 'readable by you alone, as offprompt writes it' : `mode ${mode.toString(8)}, not as offprompt writes it`}`
  const lines = [...names.map(valueLine), modeLine]
  process.stdout.write(`${lines.join('\n')}\n\n`)
  process.stdout.write(
    copied.length === 0
      ? 'No secret was written anywhere else in the project.\n'
      : `A secret was also written to: ${copied.join(', ')}\n`,
  )
  process.exitCode = lines.every(line => line.startsWith('✓')) && copied.length === 0 ? 0 : 1
}

await (command === 'check' ? check() : create())
