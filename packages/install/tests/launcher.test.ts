import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { execFile, spawn } from 'node:child_process'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createInterface } from 'node:readline'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { afterEach, expect, it } from 'vitest'

const run = promisify(execFile)

const PACKAGE = fileURLToPath(new URL('../scripts/package.mjs', import.meta.url))

/** On Windows the launcher starts the server at once, as it always did. */
const WINDOWS = process.platform === 'win32'

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

const sleep = (ms: number) => new Promise<void>(done => setTimeout(done, ms))

/** A packaged plugin and a project, and a client to connect to the launcher, or to the server itself. */
const setupTest = async () => {
  const plugin = await scratch('offprompt-launcher-')
  const project = await scratch('offprompt-project-')
  await run(process.execPath, [PACKAGE, plugin])

  const connect = async ({ direct = false, idleSeconds = 300 } = {}) => {
    const transport = new StdioClientTransport({
      command: direct ? process.execPath : join(plugin, 'launcher/offprompt-mcp'),
      args: direct ? [join(plugin, 'dist/mcp.mjs')] : [],
      cwd: project,
      stderr: 'pipe',
      env: { ...process.env, OFFPROMPT_IDLE_SECONDS: String(idleSeconds) },
    })
    const logged = { text: '' }
    transport.stderr?.on('data', (chunk: Buffer) => {
      logged.text += chunk.toString('utf8')
    })
    const client = new Client({ name: 'offprompt-launcher-test', version: 'test' })
    await client.connect(transport)
    teardowns.push(() => client.close())
    /** How many times the server started: it says where it listens each time. */
    const starts = () => logged.text.split('listening on').length - 1
    return { client, starts }
  }

  const generate = (client: Client, name: string) =>
    client.callTool({
      name: 'collect_secret',
      arguments: { secrets: [{ name, generate: {} }], reason: 'The session cookie is signed with it.', sink: { kind: 'dotenv' } },
    })

  return { plugin, project, connect, generate }
}

it('opens a session as the server itself does: the same version, instructions and tools', async () => {
  const { connect } = await setupTest()
  const launched = await connect()
  const direct = await connect({ direct: true })

  expect(launched.client.getServerVersion()).toEqual(direct.client.getServerVersion())
  expect(launched.client.getServerCapabilities()).toEqual(direct.client.getServerCapabilities())
  expect(launched.client.getInstructions()).toEqual(direct.client.getInstructions())
  expect((await launched.client.listTools()).tools).toEqual((await direct.client.listTools()).tools)
})

it.skipIf(WINDOWS)('starts no server until a tool is called, and the call is answered by it', async () => {
  const { connect, generate, project } = await setupTest()
  const { client, starts } = await connect()

  await client.listTools()
  await client.ping()
  expect(starts()).toBe(0)

  const result = await generate(client, 'SESSION_SECRET')
  expect(result.structuredContent).toMatchObject({ status: 'written' })
  expect(starts()).toBe(1)
  expect(await readFile(join(project, '.env'), 'utf8')).toMatch(/^SESSION_SECRET=/)
})

// The four seconds it waits for the server to stop leave a slow runner too little of vitest's
// five for two starts, so it has twenty.
it.skipIf(WINDOWS)(
  'stops the server once it has had nothing to do, and starts it again for the next call',
  async () => {
    const { connect, generate, project } = await setupTest()
    const { client, starts } = await connect({ idleSeconds: 1 })

    await generate(client, 'FIRST_SECRET')
    await sleep(4000)
    await client.ping()
    await generate(client, 'SECOND_SECRET')

    expect(starts()).toBe(2)
    expect(await readFile(join(project, '.env'), 'utf8')).toMatch(/^FIRST_SECRET=.*\nSECOND_SECRET=/s)
  },
  20_000,
)

/** The launcher's own replies to messages written as a host writes them, one per line. */
const exchange = async ({ plugin, project }: { plugin: string; project: string }, messages: readonly object[]) => {
  const child = spawn(join(plugin, 'launcher/offprompt-mcp'), [], { cwd: project, stdio: ['pipe', 'pipe', 'pipe'] })
  const asked = messages.flatMap(message => ('id' in message ? [message.id] : []))
  const replies = new Promise<unknown[]>((done, failed) => {
    child.once('error', failed)
    const received: { id?: unknown }[] = []
    createInterface({ input: child.stdout }).on('line', line => {
      received.push(JSON.parse(line) as { id?: unknown })
      if (asked.every(id => received.some(reply => reply.id === id))) done(received)
    })
  })
  const logged = { text: '' }
  child.stderr.on('data', (chunk: Buffer) => {
    logged.text += chunk.toString('utf8')
  })
  messages.forEach(message => child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', ...message })}\n`))
  const received = await replies
  child.stdin.end()
  await new Promise(done => child.once('exit', done))
  return { received, started: logged.text.includes('listening on') }
}

const initialize = (id: number, protocolVersion: string) => ({
  id,
  method: 'initialize',
  params: { protocolVersion, capabilities: {}, clientInfo: { name: 'host', version: '0' } },
})

it.skipIf(WINDOWS)('speaks the protocol version the host asks for where it can, and its newest where it cannot', async () => {
  const test = await setupTest()
  const versions = (await readFile(join(test.plugin, 'dist/handshake/versions'), 'utf8')).trim().split('\n')

  const older = await exchange(test, [initialize(1, '2024-11-05'), { id: 2, method: 'ping' }])
  expect(older.received).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ id: 1, result: expect.objectContaining({ protocolVersion: '2024-11-05' }) as unknown }),
      expect.objectContaining({ id: 2, result: {} }),
    ]),
  )

  const unknown = await exchange(test, [initialize(1, '1999-01-01')])
  expect(unknown.received).toEqual([
    expect.objectContaining({ result: expect.objectContaining({ protocolVersion: versions[0] }) as unknown }),
  ])
})

it.skipIf(WINDOWS)('says no to a request the server does not know, as the server does, and starts nothing', async () => {
  const test = await setupTest()

  const probed = await exchange(test, [{ id: 'probe', method: 'server/discover', params: {} }, initialize(1, '2025-11-25')])

  expect(probed.started).toBe(false)
  expect(probed.received).toEqual(
    expect.arrayContaining([{ jsonrpc: '2.0', id: 'probe', error: { code: -32601, message: 'Method not found' } }]),
  )
})

it.skipIf(WINDOWS)('hands any message it is not sure of to the server, which answers it', async () => {
  const test = await setupTest()

  const plain = await exchange(test, [initialize(1, '2025-06-18'), { id: 2, method: 'tools/list' }])
  expect(plain.started).toBe(false)

  const doubtful = await exchange(test, [
    initialize(1, '2025-06-18'),
    { id: 2, method: 'tools/list', params: { _meta: { id: 3 } } },
  ])
  expect(doubtful.started).toBe(true)
  expect(doubtful.received).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ id: 2, result: expect.objectContaining({ tools: expect.any(Array) as unknown }) as unknown }),
    ]),
  )
})
