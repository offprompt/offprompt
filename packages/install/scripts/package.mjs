import { access, chmod, cp, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, isAbsolute, join, relative, resolve } from 'node:path'

const here = resolve(import.meta.dirname, '..')
const repository = resolve(here, '../..')
const server = dirname(createRequire(import.meta.url).resolve('offprompt/package.json'))

/**
 * The launcher that starts the server. It stays out of `bin/`, whose files Claude Code puts on
 * the agent's PATH and which claude.ai refuses in a plugin.
 */
const LAUNCHER = 'launcher/offprompt-mcp'

/** Where packages made before kept the launcher, so a directory holding one can be packaged over. */
const EARLIER_LAUNCHER = 'bin/offprompt-mcp'

/** The plugin's own files: manifests for Claude Code, Codex and Agent Plugins clients, and the launcher. */
const PLUGIN = [
  '.claude-plugin/plugin.json',
  '.claude-plugin/marketplace.json',
  '.mcp.json',
  '.codex-plugin/plugin.json',
  'plugin.json',
  'mcp.json',
  LAUNCHER,
]

/**
 * The installer, which npm runs as `offprompt`, under the name its build gives it and the
 * notices name it by. It carries its dependencies, as the server does.
 */
const CLI = 'dist/offprompt-install.mjs'

/**
 * Everything the plugin and the CLI need at runtime and nothing else. The bundles carry their
 * own dependencies, so no `src`, `tests` or `node_modules` comes along.
 */
const SHIPPED = [
  ...PLUGIN.map(file => ({ file, from: join(here, 'plugin', file) })),
  { file: CLI, from: join(here, 'dist/offprompt-install.mjs') },
  { file: 'dist/mcp.mjs', from: join(server, 'dist/mcp.mjs') },
  ...['initialize.json', 'tools.json', 'versions', 'unknown', 'not-found.json'].map(name => ({
    file: `dist/handshake/${name}`,
    from: join(server, 'dist/handshake', name),
  })),
  { file: 'THIRD_PARTY_NOTICES.md', from: join(server, 'THIRD_PARTY_NOTICES.md') },
  { file: 'CHANGELOG.md', from: join(server, 'CHANGELOG.md') },
  ...['README.md', 'DESIGN.md', 'LICENSE'].map(file => ({ file, from: join(repository, file) })),
]

const EXECUTABLE = [LAUNCHER, CLI]

const exists = path =>
  access(path).then(
    () => true,
    () => false,
  )

const within = (parent, path) => {
  const rest = relative(parent, path)
  return rest === '' || (!rest.startsWith('..') && !isAbsolute(rest))
}

/** The target is cleared first, so it has to be empty or a package this script made. */
const replaceable = async path => {
  const entries = await readdir(path).catch(error => {
    if (error.code === 'ENOENT') return []
    throw error
  })
  return entries.length === 0 || (await exists(join(path, LAUNCHER))) || exists(join(path, EARLIER_LAUNCHER))
}

const refuse = message => {
  process.stderr.write(`offprompt: ${message}\n`)
  process.exit(1)
}

const target = process.argv[2]
if (target === undefined) {
  process.stderr.write('usage: pnpm package <directory>\n')
  process.exit(1)
}

const out = resolve(process.env.INIT_CWD ?? process.cwd(), target)
if (within(repository, out)) refuse('refusing to package inside the repository; choose a directory outside it')
if (!(await replaceable(out))) refuse(`${out} holds other files; choose an empty directory or an earlier package`)

const found = await Promise.all(SHIPPED.map(({ from }) => exists(from)))
const missing = SHIPPED.filter((_, index) => !found[index]).map(({ from }) => from)
if (missing.length > 0) refuse(`missing ${missing.join(', ')}; run 'pnpm package' from the repository root`)

const { version, description } = JSON.parse(await readFile(join(server, 'package.json'), 'utf8'))

/**
 * The npm package `offprompt` is this directory. It ships exactly the files above, at the
 * server's version, and depends on nothing. `mcpName` is how the MCP registry knows the
 * package is the server it lists.
 */
const manifest = {
  name: 'offprompt',
  version,
  description,
  keywords: ['mcp', 'mcp-server', 'secrets', 'api-keys', 'env', 'dotenv', 'security', 'claude-code', 'codex', 'cursor', 'ai-agents'],
  homepage: 'https://offprompt.dev',
  bugs: { url: 'https://github.com/offprompt/offprompt/issues' },
  repository: { type: 'git', url: 'git+https://github.com/offprompt/offprompt.git' },
  license: 'MIT',
  author: 'Valerio Leo',
  bin: { offprompt: CLI },
  files: SHIPPED.map(({ file }) => file).sort(),
  engines: { node: '>=22' },
  mcpName: 'io.github.offprompt/offprompt',
}

await rm(out, { recursive: true, force: true })
await Promise.all(
  SHIPPED.map(async ({ file, from }) => {
    await mkdir(dirname(join(out, file)), { recursive: true })
    await cp(from, join(out, file))
  }),
)
await writeFile(join(out, 'package.json'), `${JSON.stringify(manifest, null, 2)}\n`)
await Promise.all(EXECUTABLE.map(file => chmod(join(out, file), 0o755)))

process.stdout.write(`packaged ${SHIPPED.length + 1} files into ${out}\n`)
