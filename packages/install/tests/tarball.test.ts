import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import spawn from 'cross-spawn'
import { execFile } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { gunzipSync } from 'node:zlib'
import { afterEach, expect, it } from 'vitest'

const run = promisify(execFile)

const PACKAGE = fileURLToPath(new URL('../scripts/package.mjs', import.meta.url))

const WINDOWS = process.platform === 'win32'

/** Packing runs npm, which takes a few seconds where it starts slowly, as on Windows. */
const PACKING_MS = 60_000

/**
 * Everything the npm package ships, and nothing else: no sources, tests, maps or build caches,
 * and no top-level `bin/`, whose files Claude Code would put on the agent's PATH and which
 * claude.ai refuses in a plugin. Its root is the plugin's root, with each client's manifest.
 */
const SHIPPED = [
  '.claude-plugin/marketplace.json',
  '.claude-plugin/plugin.json',
  '.codex-plugin/plugin.json',
  '.mcp.json',
  'CHANGELOG.md',
  'DESIGN.md',
  'LICENSE',
  'README.md',
  'THIRD_PARTY_NOTICES.md',
  'dist/handshake/initialize.json',
  'dist/handshake/not-found.json',
  'dist/handshake/tools.json',
  'dist/handshake/unknown',
  'dist/handshake/versions',
  'dist/mcp.mjs',
  'dist/offprompt-install.mjs',
  'launcher/offprompt-mcp',
  'mcp.json',
  'package.json',
  'plugin.json',
]

type Entry = { readonly path: string; readonly type: string; readonly mode: number; readonly body: Buffer }

/** A field of a tar header: its text up to the first NUL. */
const field = (header: Buffer, start: number, length: number) => {
  const text = header.subarray(start, start + length).toString('utf8')
  const end = text.indexOf('\0')
  return end === -1 ? text : text.slice(0, end)
}

/**
 * The entries of a tar archive, read from their 512-byte headers up to the empty block that
 * ends it. npm writes plain ustar entries; a name too long for one would come as an extended
 * header of its own, and show up in the listing.
 */
const entriesOf = (tar: Buffer, offset = 0): readonly Entry[] => {
  const header = tar.subarray(offset, offset + 512)
  if (header.length < 512 || header.every(byte => byte === 0)) return []
  const size = parseInt(field(header, 124, 12).trim(), 8)
  const prefix = field(header, 345, 155)
  const name = field(header, 0, 100)
  const entry = {
    path: prefix === '' ? name : `${prefix}/${name}`,
    type: field(header, 156, 1),
    mode: parseInt(field(header, 100, 8).trim(), 8),
    body: tar.subarray(offset + 512, offset + 512 + size),
  }
  return [entry, ...entriesOf(tar, offset + 512 + Math.ceil(size / 512) * 512)]
}

const isPackReport = (value: unknown): value is readonly { readonly filename: string }[] =>
  Array.isArray(value) &&
  value.every(
    (item: unknown) => typeof item === 'object' && item !== null && 'filename' in item && typeof item.filename === 'string',
  )

const teardowns: (() => Promise<void>)[] = []

// Last in, first out, one after another: a server has to stop before Windows lets its folder go.
afterEach(async () => {
  await teardowns
    .splice(0)
    .reverse()
    .reduce((done, teardown) => done.then(teardown), Promise.resolve())
})

const scratch = async (prefix: string) => {
  const path = await mkdtemp(join(tmpdir(), prefix))
  teardowns.push(() => rm(path, { recursive: true, force: true }))
  return path
}

/**
 * The package as it is published: assembled by `pnpm package`, packed by `npm pack`, and read
 * back as the tarball's entries, each under `package/`. npm is a .cmd on Windows, which
 * cross-spawn starts through cmd.exe.
 */
const setupTest = async () => {
  const assembled = await scratch('offprompt-package-')
  const destination = await scratch('offprompt-tarball-')
  await run(process.execPath, [PACKAGE, assembled])
  const npm = spawn.sync('npm', ['pack', '--json', '--pack-destination', destination], { cwd: assembled, encoding: 'utf8' })
  if (npm.status !== 0) throw new Error(`npm pack exited with ${String(npm.status)}: ${String(npm.stderr)}`)
  const report: unknown = JSON.parse(String(npm.stdout))
  const [packed] = isPackReport(report) ? report : []
  if (packed === undefined) throw new Error(`npm pack reported ${String(npm.stdout)}`)
  const tarball = join(destination, packed.filename)
  return { tarball, entries: entriesOf(gunzipSync(await readFile(tarball))) }
}

it(
  'packs exactly what ships, and installs into a project from the unpacked tarball alone',
  async () => {
    const { entries } = await setupTest()
    expect(entries.map(({ path }) => path).sort()).toEqual(SHIPPED.map(file => `package/${file}`))
    expect(entries.filter(({ type }) => type !== '0').map(({ path }) => path)).toEqual([])

    const unpacked = await scratch('offprompt-unpacked-')
    const project = await scratch('offprompt-project-')
    await Promise.all(
      entries.map(async ({ path, mode, body }) => {
        await mkdir(dirname(join(unpacked, path)), { recursive: true })
        await writeFile(join(unpacked, path), body, { mode })
      }),
    )
    const cli = join(unpacked, 'package/dist/offprompt-install.mjs')
    await run(process.execPath, [cli, 'init', '--project', project, '--agent', 'claude-code'])

    expect(await readFile(join(project, 'tools/offprompt/mcp.mjs'))).toEqual(await readFile(join(unpacked, 'package/dist/mcp.mjs')))
    expect(JSON.parse(await readFile(join(project, '.mcp.json'), 'utf8'))).toEqual({
      mcpServers: { offprompt: { type: 'stdio', command: 'node', args: ['tools/offprompt/mcp.mjs'], timeout: 330_000 } },
    })

    // Started as Claude Code starts what the project declares.
    const client = new Client({ name: 'offprompt-tarball-test', version: 'test' })
    await client.connect(
      new StdioClientTransport({ command: process.execPath, args: ['tools/offprompt/mcp.mjs'], cwd: project, stderr: 'ignore' }),
    )
    teardowns.push(() => client.close())
    const { tools } = await client.listTools()
    expect(tools.map(tool => tool.name).sort()).toEqual(['await_secret', 'cancel_secret', 'collect_secret'])
  },
  PACKING_MS,
)

it(
  'declares the command, the files and the version, and depends on nothing',
  async () => {
    const { entries } = await setupTest()
    const manifest: unknown = JSON.parse(entries.find(({ path }) => path === 'package/package.json')?.body.toString('utf8') ?? '{}')
    const workspace: unknown = createRequire(import.meta.url)('offprompt/package.json')

    expect(manifest).toMatchObject({
      name: 'offprompt',
      version: typeof workspace === 'object' && workspace !== null && 'version' in workspace ? workspace.version : 'unknown',
      bin: { offprompt: 'dist/offprompt-install.mjs' },
      files: SHIPPED.filter(file => file !== 'package.json'),
      license: 'MIT',
      repository: { type: 'git', url: 'git+https://github.com/offprompt/offprompt.git' },
      homepage: 'https://offprompt.dev',
      bugs: { url: 'https://github.com/offprompt/offprompt/issues' },
      author: 'Valerio Leo',
      engines: { node: '>=22' },
      mcpName: 'io.github.offprompt/offprompt',
    })
    expect(manifest).not.toHaveProperty('dependencies')
    expect(manifest).not.toHaveProperty('private')
  },
  PACKING_MS,
)

/**
 * The tarball as tar lists it, one line per entry: its mode first and its path last, in the
 * GNU and BSD formats alike.
 */
const modesIn = async (tarball: string) => {
  const { stdout } = await run('tar', ['-tvzf', tarball])
  return stdout
    .split('\n')
    .filter(line => line.trim() !== '')
    .map(line => {
      const fields = line.trim().split(/\s+/)
      return { mode: fields[0] ?? '', path: fields.at(-1) ?? '' }
    })
}

// A file on Windows has no mode to pack, and the tar on its PATH may take C: for a host. The
// agents there do not run the launcher by its mode.
it.skipIf(WINDOWS)(
  'keeps the launcher and the CLI executable, as agents and npm run them',
  async () => {
    const { tarball } = await setupTest()
    const listed = await modesIn(tarball)

    expect(listed.map(({ path }) => path).sort()).toEqual(SHIPPED.map(file => `package/${file}`))
    expect(listed.filter(({ mode }) => mode.includes('x')).map(({ path }) => path).sort()).toEqual([
      'package/dist/offprompt-install.mjs',
      'package/launcher/offprompt-mcp',
    ])
    expect(listed.find(({ path }) => path === 'package/launcher/offprompt-mcp')?.mode).toBe('-rwxr-xr-x')
  },
  PACKING_MS,
)
