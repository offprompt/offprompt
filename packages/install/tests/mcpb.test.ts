import { unpackExtension, validateManifest } from '@anthropic-ai/mcpb'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { execFile } from 'node:child_process'
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { afterEach, expect, it } from 'vitest'

type Teardown = () => Promise<void>

const teardowns: Teardown[] = []

const run = promisify(execFile)

const MCPB = fileURLToPath(new URL('../scripts/mcpb.mjs', import.meta.url))

/** Packing reads and zips the whole server, which takes a few seconds where disks are slow, as on Windows. */
const PACKING_MS = 60_000

type Manifest = {
  readonly version: string
  readonly server: { readonly entry_point: string; readonly mcp_config: { readonly command: string; readonly args: readonly string[] } }
  readonly tools: readonly { readonly name: string }[]
}

const scratch = async (prefix: string) => {
  const path = await mkdtemp(join(tmpdir(), prefix))
  teardowns.push(() => rm(path, { recursive: true, force: true }))
  return path
}

/** Every file under a directory, relative to it and written with forward slashes, sorted. */
const filesIn = async (root: string) => {
  const entries = await readdir(root, { recursive: true, withFileTypes: true })
  return entries
    .filter(entry => entry.isFile())
    .map(entry => join(entry.parentPath, entry.name).slice(root.length + 1).split(sep).join('/'))
    .sort()
}

// Last in, first out, one after another: a server started in a folder has to stop before
// Windows lets the folder go.
afterEach(async () => {
  await teardowns
    .splice(0)
    .reverse()
    .reduce((done, teardown) => done.then(teardown), Promise.resolve())
})

it(
  'packs an MCP Bundle that starts the server from its own folder and lists the tools its manifest names',
  async () => {
    const out = await scratch('offprompt-mcpb-out-')
    const unpacked = await scratch('offprompt-mcpb-unpacked-')
    const project = await scratch('offprompt-project-')
    const bundle = join(out, 'offprompt.mcpb')
    await run(process.execPath, [MCPB, bundle])

    expect(await unpackExtension({ mcpbPath: bundle, outputDir: unpacked, silent: true })).toBe(true)
    expect(await filesIn(unpacked)).toEqual(['LICENSE', 'THIRD_PARTY_NOTICES.md', 'dist/mcp.mjs', 'icon.png', 'manifest.json'])
    expect(validateManifest(join(unpacked, 'manifest.json'))).toBe(true)

    const manifest = JSON.parse(await readFile(join(unpacked, 'manifest.json'), 'utf8')) as Manifest
    const { version } = JSON.parse(await readFile(createRequire(import.meta.url).resolve('offprompt/package.json'), 'utf8')) as {
      version: string
    }
    expect(manifest.version).toBe(version)
    expect(manifest.server.mcp_config).toEqual({ command: 'node', args: [`\${__dirname}/${manifest.server.entry_point}`] })

    // A host puts the bundle's folder in for ${__dirname} and starts the server with its own node.
    const args = manifest.server.mcp_config.args.map(arg => arg.replace('${__dirname}', unpacked))
    const client = new Client({ name: 'offprompt-test', version: 'test' })
    await client.connect(new StdioClientTransport({ command: process.execPath, args, cwd: project, stderr: 'ignore' }))
    teardowns.push(() => client.close())

    const { tools } = await client.listTools()
    expect(tools.map(tool => tool.name).sort()).toEqual(manifest.tools.map(tool => tool.name).sort())
  },
  PACKING_MS,
)

it('names a .mcpb file to pack into', async () => {
  const out = await scratch('offprompt-mcpb-out-')
  const refused = await run(process.execPath, [MCPB, join(out, 'offprompt.zip')]).then(
    () => '',
    (error: unknown) => (error !== null && typeof error === 'object' && 'stderr' in error ? String(error.stderr) : ''),
  )

  expect(refused).toContain('is not a .mcpb file')
  expect(await filesIn(out)).toEqual([])
})
