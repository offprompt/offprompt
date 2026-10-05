import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { chmod } from 'node:fs/promises'
import { afterEach, describe, expect, it } from 'vitest'

import { fail, ok, type Result } from '../src/core/result.js'
import { createRequestStore, type SecretRequest } from '../src/core/store.js'
import { formatIds } from '../src/registry/formats.js'
import { providerRefs } from '../src/registry/registry.js'
import type { Presentation } from '../src/mcp/present.js'
import { registerTools } from '../src/mcp/tools.js'
import { startLoopbackServer } from '../src/web/server.js'
import { setupWorkspace } from './helpers/workspace.js'

type Teardown = () => Promise<void>

const teardowns: Teardown[] = []

const RESEND_KEY = `re_${'a'.repeat(30)}`

const textOf = (result: unknown) => JSON.stringify(result)

const isUnknownArray = (value: unknown): value is readonly unknown[] => Array.isArray(value)

/** The text of each of a result's blocks, in order. */
const textsOf = (result: Readonly<Record<string, unknown>>) => {
  const content: unknown = result.content
  return (isUnknownArray(content) ? content : []).map(block =>
    block !== null && typeof block === 'object' && 'text' in block && typeof block.text === 'string' ? block.text : '',
  )
}

/** The JSON in a result's last text block; a written result opens with a line for the person. */
const payloadOf = (result: Readonly<Record<string, unknown>>) => {
  const text = textsOf(result).at(-1)
  if (text === undefined) throw new Error('the tool returned no text block')
  return JSON.parse(text) as Record<string, unknown>
}

const settleAfter = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms).unref())

const waitFor = async (ready: () => boolean): Promise<void> => {
  if (ready()) return
  await settleAfter(5)
  return waitFor(ready)
}

const setupTest = async ({
  git = false,
  ttlMs,
  project,
}: {
  git?: boolean
  ttlMs?: number
  /** How the project is found; the workspace by default. */
  project?: () => Promise<Result<string>>
} = {}) => {
  const workspace = await setupWorkspace({ git })
  const store = createRequestStore(ttlMs === undefined ? {} : { ttlMs })
  const opened: string[] = []
  const loopback = await startLoopbackServer({ store })

  const channels: Presentation[] = []
  const presentAs = (channel: Presentation) => channels.push(channel)

  const server = new McpServer({ name: 'offprompt', version: 'test' }, { capabilities: { tools: {} } })
  registerTools({
    server,
    store,
    loopback,
    project: project ?? (() => Promise.resolve(ok(workspace.root))),
    present: ({ url }) => {
      opened.push(url)
      return Promise.resolve(channels.shift() ?? { channel: 'browser' })
    },
  })

  const client = new Client({ name: 'test-client', version: 'test' })
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
  await Promise.all([client.connect(clientTransport), server.connect(serverTransport)])

  teardowns.push(async () => {
    await client.close()
    await server.close()
    await loopback.close()
    await workspace.cleanup()
  })

  const call = (name: string, args: Record<string, unknown>) => client.callTool({ name, arguments: args })

  const collect = (overrides: Record<string, unknown> = {}) =>
    call('collect_secret', {
      secrets: [{ name: 'RESEND_API_KEY', provider: 'resend' }],
      reason: 'The email sender reads it via dotenv at startup',
      sink: { kind: 'dotenv', path: '.env' },
      ...overrides,
    })

  const typeIntoPage = async ({ request, value }: { request: SecretRequest; value: string }) =>
    fetch(loopback.urlFor(request), {
      method: 'POST',
      body: new URLSearchParams({ nonce: request.nonce, value0: value }),
    })

  const lastRequest = () => {
    const url = opened.at(-1)
    if (url === undefined) throw new Error('no page was opened')
    const token = url.split('/r/').at(-1) ?? ''
    const request = store.byToken(token)
    if (request === undefined) throw new Error('no request for the opened page')
    return request
  }

  /** A collect_secret on the rung where the model relays the URL, so it answers at once. */
  const relayed = (overrides: Record<string, unknown> = {}) => {
    presentAs({ channel: 'result', url: 'http://127.0.0.1:1/r/relayed', reason: 'no local browser' })
    return collect(overrides)
  }

  const fillPage = ({ request, values }: { request: SecretRequest; values: readonly string[] }) =>
    fetch(loopback.urlFor(request), {
      method: 'POST',
      body: new URLSearchParams({
        nonce: request.nonce,
        ...Object.fromEntries(values.map((value, index) => [`value${String(index)}`, value])),
      }),
    })

  return {
    ...workspace,
    client,
    call,
    collect,
    relayed,
    typeIntoPage,
    fillPage,
    lastRequest,
    opened,
    presentAs,
    store,
    loopback,
  }
}

afterEach(async () => {
  await Promise.all(teardowns.splice(0).map(teardown => teardown()))
})

describe('the tool surface', () => {
  it('offers exactly the three tools the design names', async () => {
    const { client } = await setupTest()
    const { tools } = await client.listTools()
    expect(tools.map(tool => tool.name).sort()).toEqual(['await_secret', 'cancel_secret', 'collect_secret'])
  })

  it('tells the model to use it instead of asking for a paste', async () => {
    const { client } = await setupTest()
    const { tools } = await client.listTools()
    const collect = tools.find(tool => tool.name === 'collect_secret')
    expect(collect?.description).toContain('instead of asking the user to paste')
  })

  it('lets the model choose providers and formats only from the registry', async () => {
    const { client } = await setupTest()
    const { tools } = await client.listTools()
    const schema = JSON.stringify(tools.find(tool => tool.name === 'collect_secret')?.inputSchema)
    expect(schema).toContain(`"enum":${JSON.stringify(formatIds)}`)
    expect(schema).toContain(`"enum":${JSON.stringify(providerRefs)}`)
  })

  it('tells the model the four ways it can ask for a value', async () => {
    const { client } = await setupTest()
    const { tools } = await client.listTools()
    const description = tools.find(tool => tool.name === 'collect_secret')?.description ?? ''
    expect(description).toContain('`generate: {}`')
    expect(description).toContain('`provider`')
    expect(description).toContain('`format`')
    expect(description).toContain('none of these')
    expect(description).toContain('`secret: false`')
  })
})

describe('collect_secret', () => {
  it('waits for the human and answers once the value has been written', async () => {
    const { collect, typeIntoPage, lastRequest, opened, read } = await setupTest()

    const collecting = collect()
    await waitFor(() => opened.length === 1)
    const written = await typeIntoPage({ request: lastRequest(), value: RESEND_KEY })
    expect(written.status).toBe(200)

    const result = await collecting

    expect(payloadOf(result)).toMatchObject({
      status: 'written',
      names: ['RESEND_API_KEY'],
      sink: { kind: 'dotenv', path: '.env' },
    })
    expect(textOf(result)).not.toContain(RESEND_KEY)
    expect(await read('.env')).toBe(`RESEND_API_KEY=${RESEND_KEY}\n`)
  })

  it('does not answer while the page is still open', async () => {
    const { collect, opened } = await setupTest()
    const collecting = collect().then(() => 'answered' as const)
    await waitFor(() => opened.length === 1)

    const raced = await Promise.race([collecting, settleAfter(60).then(() => 'still waiting' as const)])

    expect(raced).toBe('still waiting')
  })

  it('gives up when the request expires without a value', async () => {
    const { collect } = await setupTest({ ttlMs: 30 })
    expect(payloadOf(await collect())).toMatchObject({ status: 'expired', expires_in: 0 })
  })

  it('answers straight away when the model has to relay the URL itself', async () => {
    const { collect, presentAs } = await setupTest()
    presentAs({ channel: 'result', url: 'http://127.0.0.1:1/r/abc', reason: 'no local browser' })

    const payload = payloadOf(await collect())

    expect(payload).toMatchObject({ status: 'awaiting', url: 'http://127.0.0.1:1/r/abc' })
    expect(String(payload.note)).toContain('await_secret')
  })

  it('keeps the page URL out of the result when it opened the browser itself', async () => {
    const { collect, opened } = await setupTest({ ttlMs: 30 })
    const result = await collect()
    expect(textOf(result)).not.toContain(opened[0] ?? 'no-url')
    expect(payloadOf(result).url).toBeUndefined()
  })

  it('says the same thing in the text block and the structured result', async () => {
    const { collect } = await setupTest({ ttlMs: 30 })
    const result = await collect()
    expect(payloadOf(result)).toEqual(result.structuredContent)
  })

  it('opens a written result with a line for the person, the fingerprint in it', async () => {
    const { collect, typeIntoPage, lastRequest, opened } = await setupTest()
    const collecting = collect()
    await waitFor(() => opened.length === 1)
    await typeIntoPage({ request: lastRequest(), value: RESEND_KEY })

    const result = await collecting
    const emoji = String(payloadOf(result).emoji)

    // Hosts show a result's first line under the call, so the four are in view whatever the agent does next.
    expect(textsOf(result)).toHaveLength(2)
    expect(textsOf(result)[0]).toBe(`Wrote 1 value to .env · fingerprint ${emoji}`)
    expect(payloadOf(result)).toEqual(result.structuredContent)
  })

  it('asks for the fingerprint first, and at once, not at the end of the reply', async () => {
    const { collect, typeIntoPage, lastRequest, opened } = await setupTest()
    const collecting = collect()
    await waitFor(() => opened.length === 1)
    await typeIntoPage({ request: lastRequest(), value: RESEND_KEY })

    const payload = payloadOf(await collecting)

    expect(String(payload.note)).toMatch(
      new RegExp(`^Write this to the user now, before your next tool call, on a line of its own: "Fingerprint ${String(payload.emoji)}"\\.`),
    )
  })

  it('puts the line to say first in the structured result, which Claude Code reads and shows', async () => {
    const { collect, typeIntoPage, lastRequest, opened } = await setupTest()
    const collecting = collect()
    await waitFor(() => opened.length === 1)
    await typeIntoPage({ request: lastRequest(), value: RESEND_KEY })

    const result = await collecting
    expect(Object.keys(result.structuredContent ?? {})[0]).toBe('tell_user')
    expect(payloadOf(result).tell_user).toBe(`Fingerprint ${String(payloadOf(result).emoji)}`)
  })

  it('has nothing to say while the request is open, or when no page took a fingerprint', async () => {
    const { relayed, collect } = await setupTest()
    expect(payloadOf(await relayed()).tell_user).toBeUndefined()
    expect(payloadOf(await collect({ secrets: [{ name: 'AUTH_SECRET', generate: {} }] })).tell_user).toBeUndefined()
  })

  it('tells the agent to have the project read a file of its own from its path', async () => {
    const { collect, typeIntoPage, lastRequest, opened } = await setupTest()
    const pem = '-----BEGIN PUBLIC KEY-----\nMFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE\n-----END PUBLIC KEY-----'
    const collecting = collect({
      secrets: [{ name: 'VERIFICATION_KEY', format: 'pem', secret: false }],
      sink: { kind: 'file', path: 'keys/verification.pem' },
    })
    await waitFor(() => opened.length === 1)
    await typeIntoPage({ request: lastRequest(), value: pem })

    const payload = payloadOf(await collecting)

    expect(payload.tell_user).toMatch(/^Fingerprint \S+ \S+ \S+ \S+$/)
    expect(String(payload.note)).toContain('VERIFICATION_KEY is the whole of keys/verification.pem. Have the project read it from that path.')
    expect(String(payload.note)).not.toContain('from the environment')
  })

  it('adds no line of its own while the request is still open', async () => {
    const { relayed } = await setupTest()
    expect(textsOf(await relayed())).toHaveLength(1)
  })

  it('refuses a sink outside the project', async () => {
    const { collect } = await setupTest()
    const result = await collect({ sink: { kind: 'dotenv', path: '../.env' } })
    expect(result.isError).toBe(true)
    expect(textOf(result)).toContain('outside the project')
  })

  it('refuses a key name that is not an env key', async () => {
    const { collect } = await setupTest()
    const result = await collect({ secrets: [{ name: 'resend api key', provider: 'resend' }] })
    expect(result.isError).toBe(true)
    expect(textOf(result)).toContain('SCREAMING_SNAKE_CASE')
  })

  it('refuses a format that is not in the registry', async () => {
    const { collect, opened } = await setupTest()
    const result = await collect({ secrets: [{ name: 'A_KEY', format: 'made_up' }] })
    expect(result.isError).toBe(true)
    expect(textOf(result)).toContain('Invalid option')
    expect(opened).toEqual([])
  })

  it('defaults the dotenv path to .env', async () => {
    const { collect } = await setupTest({ ttlMs: 30 })
    const result = await collect({ sink: { kind: 'dotenv' } })
    expect(payloadOf(result)).toMatchObject({ sink: { path: '.env' } })
  })
})

describe('await_secret', () => {
  it('reports the write without ever carrying the value', async () => {
    const { relayed, typeIntoPage, lastRequest, call, read } = await setupTest()
    const opened = payloadOf(await relayed())
    const request = lastRequest()

    const written = await typeIntoPage({ request, value: RESEND_KEY })
    expect(written.status).toBe(200)

    const result = await call('await_secret', { request_id: opened.request_id })

    expect(payloadOf(result)).toMatchObject({
      status: 'written',
      names: ['RESEND_API_KEY'],
      sink: { kind: 'dotenv', path: '.env' },
    })
    expect(textOf(result)).not.toContain(RESEND_KEY)
    expect(await read('.env')).toBe(`RESEND_API_KEY=${RESEND_KEY}\n`)
  })

  it('resolves as soon as the human submits, without polling again', async () => {
    const { relayed, typeIntoPage, lastRequest, call } = await setupTest()
    const opened = payloadOf(await relayed())
    const request = lastRequest()

    const waiting = call('await_secret', { request_id: opened.request_id })
    await typeIntoPage({ request, value: RESEND_KEY })

    expect(payloadOf(await waiting)).toMatchObject({ status: 'written' })
  })

  it('reports an unknown request id as an error rather than a status', async () => {
    const { call } = await setupTest()
    const result = await call('await_secret', { request_id: 'deadbeef' })
    expect(result.isError).toBe(true)
    expect(textOf(result)).toContain('No offprompt request with id deadbeef')
  })

  it('reports an expired request', async () => {
    const { relayed, call } = await setupTest()
    const opened = payloadOf(await relayed())
    await call('cancel_secret', { request_id: opened.request_id })

    expect(payloadOf(await call('await_secret', { request_id: opened.request_id }))).toMatchObject({
      status: 'expired',
    })
  })
})

describe('a request offprompt cannot take', () => {
  it('is refused, saying why, when there is no project to write into', async () => {
    const { collect } = await setupTest({
      project: () => Promise.resolve(fail('it was started in its own folder, and the client named no workspace')),
    })
    const result = await collect()
    expect(result.isError).toBe(true)
    expect(textOf(result)).toContain('offprompt refused that request: it was started in its own folder')
  })

  // Windows ignores a folder's mode, so a folder that takes no new files cannot be made this way there.
  it.skipIf(process.platform === 'win32')(
    'is refused, and nothing stays open, when the file system will not take a generated value',
    async () => {
      const { collect, root, store, exists } = await setupTest()
      await chmod(root, 0o500)
      teardowns.unshift(() => chmod(root, 0o700))

      const result = await collect({ secrets: [{ name: 'AUTH_SECRET', generate: {} }] })

      expect(result.isError).toBe(true)
      expect(textOf(result)).toContain('EACCES')
      expect(store.openCount()).toBe(0)
      expect(await exists('.env')).toBe(false)
    },
  )
})

describe('cancel_secret', () => {
  it('reports an unknown request id as an error rather than a status', async () => {
    const { call } = await setupTest()
    const result = await call('cancel_secret', { request_id: 'deadbeef' })
    expect(result.isError).toBe(true)
    expect(textOf(result)).toContain('No offprompt request with id deadbeef')
  })

  it('expires the request and discards the page', async () => {
    const { relayed, call, lastRequest, typeIntoPage, exists } = await setupTest()
    const opened = payloadOf(await relayed())
    const request = lastRequest()

    const cancelled = await call('cancel_secret', { request_id: opened.request_id })
    expect(payloadOf(cancelled)).toMatchObject({ status: 'expired' })

    const late = await typeIntoPage({ request, value: RESEND_KEY })
    expect(late.status).toBe(410)
    expect(await exists('.env')).toBe(false)
  })

  it('is safe to call twice', async () => {
    const { relayed, call } = await setupTest()
    const opened = payloadOf(await relayed())
    await call('cancel_secret', { request_id: opened.request_id })
    expect(payloadOf(await call('cancel_secret', { request_id: opened.request_id }))).toMatchObject({
      status: 'expired',
    })
  })
})

describe('asking for several secrets at once', () => {
  const twoKeys = {
    secrets: [
      { name: 'API_SECRET_A', format: 'text' },
      { name: 'API_SECRET_B', format: 'text' },
    ],
  }

  it('opens one page for the whole batch', async () => {
    const { relayed, opened } = await setupTest()

    const result = await relayed(twoKeys)

    expect(payloadOf(result)).toMatchObject({ names: ['API_SECRET_A', 'API_SECRET_B'] })
    expect(opened).toHaveLength(1)
  })

  it('writes a batch and reports only the names', async () => {
    const { relayed, lastRequest, fillPage, call, read } = await setupTest()
    const request0 = payloadOf(await relayed(twoKeys))
    const request = lastRequest()

    const written = await fillPage({
      request,
      values: ['some_secret_a', 'some secret with b and spaces'],
    })
    expect(written.status).toBe(200)

    const result = await call('await_secret', { request_id: request0.request_id })

    expect(payloadOf(result)).toMatchObject({
      status: 'written',
      names: ['API_SECRET_A', 'API_SECRET_B'],
    })
    expect(textOf(result)).not.toContain('some_secret_a')
    expect(await read('.env')).toBe(
      "API_SECRET_A=some_secret_a\nAPI_SECRET_B='some secret with b and spaces'\n",
    )
  })

  it('refuses a batch aimed at a file sink', async () => {
    const { relayed } = await setupTest()

    const result = await relayed({
      secrets: [
        { name: 'A', format: 'text' },
        { name: 'B', format: 'text' },
      ],
      sink: { kind: 'file', path: 'id.pem' },
    })

    expect(result.isError).toBe(true)
    expect(textOf(result)).toContain('a file sink holds exactly one value')
  })

  it('refuses the same key asked for twice', async () => {
    const { relayed } = await setupTest()

    const result = await relayed({
      secrets: [
        { name: 'SAME_KEY', format: 'text' },
        { name: 'SAME_KEY', format: 'text' },
      ],
    })

    expect(result.isError).toBe(true)
    expect(textOf(result)).toContain('SAME_KEY is asked for twice')
  })

  it('refuses an empty list', async () => {
    const { relayed } = await setupTest()
    expect((await relayed({ secrets: [] })).isError).toBe(true)
  })
})

describe('captions', () => {
  it('lets the agent give a secret a short caption', async () => {
    const { relayed, lastRequest } = await setupTest()

    await relayed({
      secrets: [{ name: 'STRIPE_SECRET_KEY', format: 'text', caption: 'Stripe dashboard → Developers → API keys' }],
    })

    expect(lastRequest().secrets[0]?.caption).toBe('Stripe dashboard → Developers → API keys')
  })

  it('leaves the caption out when the agent gives none', async () => {
    const { relayed, lastRequest } = await setupTest()
    await relayed({ secrets: [{ name: 'A_KEY', format: 'text' }] })
    expect(lastRequest().secrets[0]).not.toHaveProperty('caption')
  })

  it('refuses a caption too long to be a caption', async () => {
    const { relayed } = await setupTest()
    const result = await relayed({ secrets: [{ name: 'A_KEY', format: 'text', caption: 'x'.repeat(200) }] })
    expect(result.isError).toBe(true)
  })
})

describe('generated values', () => {
  const generated = { secrets: [{ name: 'AUTH_SECRET', generate: {} }] }

  it('writes them at once, with no page to open', async () => {
    const { collect, opened, read } = await setupTest()

    const result = await collect(generated)
    const payload = payloadOf(result)

    expect(payload).toMatchObject({ status: 'written', names: ['AUTH_SECRET'] })
    expect(payload.kept).toBeUndefined()
    // No page, so no fingerprint to compare.
    expect(payload.emoji).toBeUndefined()
    expect(textsOf(result)[0]).toBe('Wrote 1 value to .env')
    expect(opened).toEqual([])
    expect(await read('.env')).toMatch(/^AUTH_SECRET=[A-Za-z0-9_-]{43}\n$/)
  })

  it('never hands the value back, even to the agent that asked for it', async () => {
    const { collect, read } = await setupTest()
    const result = await collect(generated)
    const value = (await read('.env')).replace('AUTH_SECRET=', '').trim()
    expect(textOf(result)).not.toContain(value)
  })

  it('writes as many bytes as asked, in the encoding asked', async () => {
    const { collect, read } = await setupTest()
    await collect({ secrets: [{ name: 'ENCRYPTION_KEY', generate: { bytes: 16, encoding: 'hex' } }] })
    expect(await read('.env')).toMatch(/^ENCRYPTION_KEY=[0-9a-f]{32}\n$/)
  })

  it('keeps a key that is already set, rather than signing everyone out', async () => {
    const { collect, write, read } = await setupTest()
    await write('.env', 'AUTH_SECRET=already-here\n')

    const result = await collect(generated)
    const payload = payloadOf(result)

    expect(payload).toMatchObject({ status: 'written', kept: ['AUTH_SECRET'] })
    expect(String(payload.note)).toContain('AUTH_SECRET was already set and left as it was.')
    expect(textsOf(result)[0]).toBe('.env already held AUTH_SECRET')
    expect(await read('.env')).toBe('AUTH_SECRET=already-here\n')
  })

  it('refuses a file git tracks, because only the human can allow that write', async () => {
    const { collect, write, track, exists } = await setupTest({ git: true })
    await write('.env', 'PORT=3000\n')
    await track('.env')

    const result = await collect(generated)

    expect(result.isError).toBe(true)
    expect(textOf(result)).toContain('git tracks .env')
    expect(await exists('.env')).toBe(true)
  })

  it('makes one when its field comes back empty, alongside the values the human typed', async () => {
    const { collect, lastRequest, opened, read, loopback } = await setupTest()
    const collecting = collect({
      secrets: [
        { name: 'AUTH_SECRET', generate: {} },
        { name: 'RESEND_API_KEY', provider: 'resend' },
      ],
    })
    await waitFor(() => opened.length === 1)
    const request = lastRequest()

    const page = await (await fetch(loopback.urlFor(request))).text()
    expect(page).toContain('name="value0" data-key="AUTH_SECRET"')
    expect(page).toContain('data-generate="{&quot;bytes&quot;:32,&quot;encoding&quot;:&quot;base64url&quot;}"')

    const written = await fetch(loopback.urlFor(request), {
      method: 'POST',
      body: new URLSearchParams({ nonce: request.nonce, value1: RESEND_KEY }),
    })
    expect(written.status).toBe(200)

    expect(payloadOf(await collecting)).toMatchObject({ status: 'written', names: ['AUTH_SECRET', 'RESEND_API_KEY'] })
    expect(await read('.env')).toMatch(new RegExp(`^AUTH_SECRET=[A-Za-z0-9_-]{43}\nRESEND_API_KEY=${RESEND_KEY}\n$`))
  })

  it('writes the one the page made or the human pasted, once it is long enough', async () => {
    const { collect, lastRequest, opened, read, loopback } = await setupTest()
    const collecting = collect({ secrets: [{ name: 'SESSION_KEY', generate: { bytes: 16, encoding: 'hex' } }, { name: 'PORT' }] })
    await waitFor(() => opened.length === 1)
    const request = lastRequest()
    const post = (value0: string) =>
      fetch(loopback.urlFor(request), {
        method: 'POST',
        body: new URLSearchParams({ nonce: request.nonce, value0, value1: '3000' }),
      })

    const short = await post('abc123')
    expect(short.status).toBe(422)
    expect(await short.text()).toContain('at least 32 hex characters · 16 bytes')

    const own = 'a91f3c07e2b84d19f6a0c5e7d2b4c6e2'
    expect((await post(own)).status).toBe(200)
    expect(payloadOf(await collecting)).toMatchObject({ status: 'written' })
    expect(await read('.env')).toBe(`SESSION_KEY=${own}\nPORT=3000\n`)
  })
})

describe('provider keys', () => {
  it('asks which key when a provider issues several and the name does not say', async () => {
    const { relayed } = await setupTest()
    const result = await relayed({ secrets: [{ name: 'PAYMENTS_KEY', provider: 'stripe' }] })
    expect(result.isError).toBe(true)
    expect(textOf(result)).toContain('stripe/secret_key, stripe/publishable_key, stripe/webhook_secret')
  })

  it('refuses a key asked for two ways at once', async () => {
    const { relayed } = await setupTest()
    const result = await relayed({ secrets: [{ name: 'A_KEY', provider: 'resend', generate: {} }] })
    expect(result.isError).toBe(true)
    expect(textOf(result)).toContain('give at most one of generate, provider and format')
  })

  it('recognises a provider key by its usual name when the agent names none', async () => {
    const { relayed, lastRequest } = await setupTest()
    await relayed({ secrets: [{ name: 'OPENAI_API_KEY' }] })
    const [secret] = lastRequest().secrets
    expect(secret?.value.kind === 'typed' ? secret.value.source?.provider.name : undefined).toBe('OpenAI')
  })
})
