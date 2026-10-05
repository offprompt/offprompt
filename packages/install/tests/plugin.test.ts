import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { execFile } from 'node:child_process'
import { cp, mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { afterEach, expect, it } from 'vitest'

import { startWithNode } from '../src/plugin.js'
import { globalServer, projectServer } from '../src/server.js'
import { FORWARDED } from '../src/targets/codex.js'

type Teardown = () => Promise<void>

const teardowns: Teardown[] = []

const run = promisify(execFile)

const PACKAGE = fileURLToPath(new URL('../scripts/package.mjs', import.meta.url))

const versionIn = async (path: string) => {
  const manifest: unknown = JSON.parse(await readFile(path, 'utf8'))
  return manifest !== null && typeof manifest === 'object' && 'version' in manifest ? manifest.version : undefined
}

/** Every file under a directory, relative to it and written with forward slashes, sorted. */
const filesIn = async (root: string) => {
  const entries = await readdir(root, { recursive: true, withFileTypes: true })
  return entries
    .filter(entry => entry.isFile())
    .map(entry => join(entry.parentPath, entry.name).slice(root.length + 1).split(sep).join('/'))
    .sort()
}

/** What a run that should fail wrote to stderr, or nothing if it succeeded. */
const refusalOf = (running: Promise<unknown>) =>
  running.then(
    () => '',
    (error: unknown) => (error !== null && typeof error === 'object' && 'stderr' in error ? String(error.stderr) : ''),
  )

const scratch = async (prefix: string) => {
  const path = await mkdtemp(join(tmpdir(), prefix))
  teardowns.push(() => rm(path, { recursive: true, force: true }))
  return path
}

// Last in, first out, one after another: a server started in a folder has to stop before
// Windows lets the folder go.
afterEach(async () => {
  await teardowns
    .splice(0)
    .reverse()
    .reduce((done, teardown) => done.then(teardown), Promise.resolve())
})

it('declares the version of the server it ships, in every manifest', async () => {
  const server = await versionIn(createRequire(import.meta.url).resolve('offprompt/package.json'))

  expect(await versionIn(fileURLToPath(new URL('../plugin/.claude-plugin/plugin.json', import.meta.url)))).toBe(server)
  expect(await versionIn(fileURLToPath(new URL('../plugin/.codex-plugin/plugin.json', import.meta.url)))).toBe(server)
  expect(await versionIn(fileURLToPath(new URL('../plugin/plugin.json', import.meta.url)))).toBe(server)
})

it('lists the version it ships in the MCP Registry entry, which takes each version once', async () => {
  const server = await versionIn(createRequire(import.meta.url).resolve('offprompt/package.json'))
  const entry: unknown = JSON.parse(await readFile(fileURLToPath(new URL('../../../server.json', import.meta.url)), 'utf8'))

  expect(entry).toMatchObject({ version: server, packages: [{ identifier: 'offprompt', version: server }] })
})

it('starts the server for Codex as a project does, with the same wait and the same variables', async () => {
  const manifest: unknown = JSON.parse(await readFile(fileURLToPath(new URL('../plugin/.codex-plugin/plugin.json', import.meta.url)), 'utf8'))

  expect(manifest).toMatchObject({
    mcpServers: {
      offprompt: {
        command: './launcher/offprompt-mcp',
        cwd: '.',
        tool_timeout_sec: projectServer.timeoutMs / 1000,
        env_vars: [...FORWARDED],
      },
    },
  })
})

/** The offprompt server a manifest in a plugin folder declares. */
const serverIn = async (plugin: string, manifest: string) => {
  const parsed: unknown = JSON.parse(await readFile(join(plugin, manifest), 'utf8'))
  const servers = parsed !== null && typeof parsed === 'object' && 'mcpServers' in parsed ? parsed.mcpServers : undefined
  return servers !== null && typeof servers === 'object' && servers !== undefined && 'offprompt' in servers ? servers.offprompt : undefined
}

it('starts the bundle with node on Windows, which runs no sh launcher by itself', async () => {
  const plugin = await scratch('offprompt-plugin-')
  await cp(fileURLToPath(new URL('../plugin', import.meta.url)), plugin, { recursive: true })

  await startWithNode(plugin)

  // Each agent names the bundle its own way, and keeps everything else its manifest says.
  expect(await serverIn(plugin, '.mcp.json')).toEqual({
    type: 'stdio',
    command: 'node',
    args: ['${CLAUDE_PLUGIN_ROOT}/dist/mcp.mjs'],
    timeout: 330_000,
    env: { CLAUDE_PLUGIN_DATA: '${CLAUDE_PLUGIN_DATA}' },
  })
  expect(await serverIn(plugin, 'mcp.json')).toEqual({ type: 'stdio', command: 'node', args: ['${PLUGIN_ROOT}/dist/mcp.mjs'] })
  expect(await serverIn(plugin, '.codex-plugin/plugin.json')).toEqual({
    command: 'node',
    args: ['./dist/mcp.mjs'],
    cwd: '.',
    tool_timeout_sec: 330,
    env_vars: [...FORWARDED],
  })
  expect(globalServer(plugin, 'win32')).toEqual({ command: 'node', args: [join(plugin, 'dist/mcp.mjs')], timeoutMs: 330_000 })
  expect(globalServer(plugin, 'linux')).toEqual({ command: join(plugin, 'launcher/offprompt-mcp'), args: [], timeoutMs: 330_000 })
})

it('packages a directory that starts the server from its own launcher', async () => {
  const plugin = await scratch('offprompt-plugin-')
  const project = await scratch('offprompt-project-')
  await run(process.execPath, [PACKAGE, plugin])

  expect(await filesIn(plugin)).toEqual([
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
  ])

  const client = new Client({ name: 'offprompt-test', version: 'test' })
  await client.connect(
    new StdioClientTransport({ command: join(plugin, 'launcher/offprompt-mcp'), args: [], cwd: project, stderr: 'ignore' }),
  )
  teardowns.push(() => client.close())

  const { tools } = await client.listTools()
  expect(tools.map(tool => tool.name).sort()).toEqual(['await_secret', 'cancel_secret', 'collect_secret'])
})

it('leaves a directory it did not make, and the repository, alone', async () => {
  const home = await scratch('offprompt-home-')
  await mkdir(join(home, 'notes'))
  await writeFile(join(home, 'notes/todo.md'), 'keep me\n')

  expect(await refusalOf(run(process.execPath, [PACKAGE, home]))).toContain('holds other files')
  expect(await filesIn(home)).toEqual(['notes/todo.md'])

  const template = fileURLToPath(new URL('../plugin', import.meta.url))
  expect(await refusalOf(run(process.execPath, [PACKAGE, template]))).toContain('inside the repository')
})

it('packages over a package it made before', async () => {
  const plugin = await scratch('offprompt-plugin-')
  await run(process.execPath, [PACKAGE, plugin])
  await writeFile(join(plugin, 'stale.txt'), 'from an older version\n')

  await run(process.execPath, [PACKAGE, plugin])

  expect(await filesIn(plugin)).not.toContain('stale.txt')
})

it('packages over a package made when the launcher was in bin/, and leaves no bin/ behind', async () => {
  const plugin = await scratch('offprompt-plugin-')
  await mkdir(join(plugin, 'bin'))
  await writeFile(join(plugin, 'bin/offprompt-mcp'), '#!/bin/sh\n')

  await run(process.execPath, [PACKAGE, plugin])

  expect((await filesIn(plugin)).filter(file => file.startsWith('bin/'))).toEqual([])
})
