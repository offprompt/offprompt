import { spawn } from 'node:child_process'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { ListRootsRequestSchema } from '@modelcontextprotocol/sdk/types.js'
import { copyFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { afterEach, expect, it } from 'vitest'

import { plaintextFor, sealerFor } from '../src/web/client/seal.js'
import { setupWorkspace } from './helpers/workspace.js'

type Teardown = () => Promise<void>

const teardowns: Teardown[] = []

const BUNDLE = fileURLToPath(new URL('../dist/mcp.mjs', import.meta.url))

const RESEND_KEY = `re_${'a'.repeat(30)}`

const isUnknownArray = (value: unknown): value is readonly unknown[] => Array.isArray(value)

/** The JSON in a result's last text block; a written result opens with a line for the person. */
const payloadOf = (result: Readonly<Record<string, unknown>>) => {
  const content: unknown = result.content
  const block: unknown = (isUnknownArray(content) ? content : []).at(-1)
  const text: unknown = block !== null && typeof block === 'object' && 'text' in block ? block.text : undefined
  if (typeof text !== 'string') throw new Error('the tool returned no text block')
  return JSON.parse(text) as Record<string, unknown>
}

/**
 * Starts the bundle the plugin ships the way an agent does, over stdio, with the project
 * directory as its working directory. `SSH_CONNECTION` makes the session a remote one, so
 * the ladder stays off the browser and the test drives the page itself, and
 * `OFFPROMPT_TUNNEL=off` keeps it on the loopback, off the network.
 */
const setupTest = async () => {
  const workspace = await setupWorkspace()
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [BUNDLE],
    cwd: workspace.root,
    env: { ...process.env, SSH_CONNECTION: '1 1 1 1', OFFPROMPT_TUNNEL: 'off' },
    stderr: 'ignore',
  })
  const client = new Client({ name: 'offprompt-test', version: 'test' })
  await client.connect(transport)

  teardowns.push(async () => {
    await client.close()
    await workspace.cleanup()
  })

  return { ...workspace, client }
}

afterEach(async () => {
  await Promise.all(teardowns.splice(0).map(teardown => teardown()))
})

it('serves the three tools and its instructions over stdio', async () => {
  const { client } = await setupTest()

  const { tools } = await client.listTools()

  expect(tools.map(tool => tool.name).sort()).toEqual(['await_secret', 'cancel_secret', 'collect_secret'])
  expect(client.getInstructions()).toContain('collect_secret')
})

it('collects a value through the page it opened and reports only the key', async () => {
  const { client, read, exists } = await setupTest()
  expect(await exists('.env')).toBe(false)

  const collected = payloadOf(
    await client.callTool({
      name: 'collect_secret',
      arguments: {
        secrets: [
          { name: 'RESEND_API_KEY', provider: 'resend' },
          { name: 'RESEND_FROM_ADDRESS', format: 'email' },
        ],
        reason: 'The email sender reads both via dotenv at startup',
        sink: { kind: 'dotenv', path: '.env' },
      },
    }),
  )

  expect(collected).toMatchObject({
    status: 'awaiting',
    names: ['RESEND_API_KEY', 'RESEND_FROM_ADDRESS'],
  })

  const link = /http:\/\/127\.0\.0\.1:\d+\/r\/[0-9a-f]+#k=[\w-]+/.exec(String(collected.note))?.[0]
  if (link === undefined) throw new Error('the result carried no page link over SSH')
  expect(collected.url).toBe(link)
  const { origin, pathname, hash } = new URL(link)
  const url = `${origin}${pathname}`

  const page = await (await fetch(url)).text()
  const nonce = /name="nonce" value="([0-9a-f]+)"/.exec(page)?.[1]
  if (nonce === undefined) throw new Error('the page carried no nonce')

  // What the page script does on Write it: seal the values to the key in the link.
  const sealer = await sealerFor({ hash, token: pathname.split('/').at(-1) ?? '', nonce })
  if (typeof sealer === 'string') throw new Error(sealer)
  const values = new Map([
    ['value0', RESEND_KEY],
    ['value1', 'hello@example.com'],
  ])
  const sealed = await sealer(plaintextFor({ values, allowTracked: false }))
  expect(sealed).not.toContain(RESEND_KEY)

  const submitted = await fetch(url, { method: 'POST', body: new URLSearchParams({ nonce, sealed }) })
  expect(submitted.status).toBe(200)

  const awaited = await client.callTool({
    name: 'await_secret',
    arguments: { request_id: collected.request_id },
  })

  expect(payloadOf(awaited)).toMatchObject({
    status: 'written',
    names: ['RESEND_API_KEY', 'RESEND_FROM_ADDRESS'],
  })
  expect(JSON.stringify(awaited)).not.toContain(RESEND_KEY)
  expect(await read('.env')).toBe(`RESEND_API_KEY=${RESEND_KEY}\nRESEND_FROM_ADDRESS=hello@example.com\n`)
})

/**
 * Starts the bundle the way an Agent Plugins client does: copied into a plugin folder of its
 * own, with that folder as the working directory.
 */
/** This process's environment, without the names it leaves unset. */
const definedEnv = () =>
  Object.fromEntries(Object.entries(process.env).flatMap(([name, value]) => (value === undefined ? [] : [[name, value]])))

const setupPlugin = async ({
  roots,
  env = {},
}: {
  /** Root URIs as the client sends them; a path stands for its file URL. */
  roots: readonly string[]
  env?: Readonly<Record<string, string>>
}) => {
  const plugin = await setupWorkspace()
  await mkdir(join(plugin.root, 'dist'))
  await copyFile(BUNDLE, join(plugin.root, 'dist/mcp.mjs'))
  const client = new Client(
    { name: 'offprompt-test', version: 'test' },
    { capabilities: roots.length === 0 ? {} : { roots: {} } },
  )
  if (roots.length > 0) {
    client.setRequestHandler(ListRootsRequestSchema, () => ({
      roots: roots.map(root => ({ uri: root.startsWith('/') ? pathToFileURL(root).href : root })),
    }))
  }
  await client.connect(
    new StdioClientTransport({
      command: process.execPath,
      args: [join(plugin.root, 'dist/mcp.mjs')],
      cwd: plugin.root,
      env: { ...definedEnv(), ...env },
      stderr: 'ignore',
    }),
  )
  teardowns.push(async () => {
    await client.close()
    await plugin.cleanup()
  })
  return { plugin, client }
}

const GENERATED = {
  secrets: [{ name: 'SESSION_SECRET', generate: {} }],
  reason: 'Signs session cookies',
  sink: { kind: 'dotenv', path: '.env' },
}

it('writes into the workspace root the client names when started in its own folder', async () => {
  const workspace = await setupWorkspace()
  teardowns.push(workspace.cleanup)
  const { plugin, client } = await setupPlugin({ roots: [workspace.root] })

  const written = payloadOf(await client.callTool({ name: 'collect_secret', arguments: GENERATED }))

  expect(written).toMatchObject({ status: 'written', names: ['SESSION_SECRET'] })
  expect(await workspace.read('.env')).toMatch(/^SESSION_SECRET=\S{43}\n$/)
  expect(await plugin.exists('.env')).toBe(false)
})

it('writes into the workspace Codex names in the call when started in its own folder', async () => {
  const workspace = await setupWorkspace()
  teardowns.push(workspace.cleanup)
  const { plugin, client } = await setupPlugin({ roots: [] })

  const written = payloadOf(
    await client.callTool({
      name: 'collect_secret',
      arguments: GENERATED,
      _meta: { 'x-codex-turn-metadata': { workspaces: { [workspace.root]: { has_changes: false } } } },
    }),
  )

  expect(written).toMatchObject({ status: 'written', names: ['SESSION_SECRET'] })
  expect(await workspace.read('.env')).toMatch(/^SESSION_SECRET=\S{43}\n$/)
  expect(await plugin.exists('.env')).toBe(false)
})

it('keeps the file roots when the client also names one that is not a file URL, as a Cursor window can', async () => {
  const workspace = await setupWorkspace()
  teardowns.push(workspace.cleanup)
  const { plugin, client } = await setupPlugin({ roots: ['vscode-vfs://github/acme/relay', workspace.root] })

  const written = payloadOf(await client.callTool({ name: 'collect_secret', arguments: GENERATED }))

  expect(written).toMatchObject({ status: 'written' })
  expect(await workspace.exists('.env')).toBe(true)
  expect(await plugin.exists('.env')).toBe(false)
})

it("writes into the folder Cursor names in the environment when it names no roots", async () => {
  const workspace = await setupWorkspace()
  teardowns.push(workspace.cleanup)
  const { plugin, client } = await setupPlugin({ roots: [], env: { WORKSPACE_FOLDER_PATHS: workspace.root } })

  const written = payloadOf(await client.callTool({ name: 'collect_secret', arguments: GENERATED }))

  expect(written).toMatchObject({ status: 'written' })
  expect(await workspace.exists('.env')).toBe(true)
  expect(await plugin.exists('.env')).toBe(false)
})

it('refuses rather than write into its own folder when the client names no workspace', async () => {
  const { plugin, client } = await setupPlugin({ roots: [] })

  const refused = await client.callTool({ name: 'collect_secret', arguments: GENERATED })

  expect(refused.isError).toBe(true)
  expect(JSON.stringify(refused)).toContain('no project to write to')
  expect(await plugin.exists('.env')).toBe(false)
})

it('exits once its client closes stdin, rather than outliving the session', async () => {
  const workspace = await setupWorkspace()
  teardowns.push(workspace.cleanup)
  const child = spawn(process.execPath, [BUNDLE], { cwd: workspace.root, stdio: ['pipe', 'ignore', 'ignore'] })
  await new Promise(resolve => setTimeout(resolve, 400))
  expect(child.exitCode).toBeNull()

  const exited = new Promise<number | null>(resolve => child.once('exit', resolve))
  child.stdin.end()

  const code = await Promise.race([
    exited,
    new Promise<'still running'>(resolve => setTimeout(() => resolve('still running'), 3000)),
  ])
  if (code === 'still running') child.kill('SIGKILL')
  expect(code).toBe(0)
})
