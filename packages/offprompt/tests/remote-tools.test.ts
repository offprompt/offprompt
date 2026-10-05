import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { ElicitRequestSchema } from '@modelcontextprotocol/sdk/types.js'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ok } from '../src/core/result.js'
import { createRequestStore } from '../src/core/store.js'
import { createPresenter } from '../src/mcp/present.js'
import type { Whereabouts } from '../src/mcp/remote.js'
import { registerTools } from '../src/mcp/tools.js'
import { plaintextFor, sealerFor } from '../src/web/client/seal.js'
import { startLoopbackServer } from '../src/web/server.js'
import { setupWorkspace } from './helpers/workspace.js'

const teardowns: (() => Promise<void>)[] = []

const TUNNEL = 'https://some-words.trycloudflare.com'

const RESEND_KEY = `re_${'a'.repeat(30)}`

type Answer = {
  request_id: string
  status: string
  expires_in: number
  note: string
  url?: string
  file_keys?: string[]
  emoji?: string
}

const setupTest = async ({
  where = 'remote',
  tunnelComesUp = true,
  elicitation = false,
}: {
  where?: Whereabouts
  tunnelComesUp?: boolean
  elicitation?: boolean
} = {}) => {
  const workspace = await setupWorkspace()
  const store = createRequestStore()
  const loopback = await startLoopbackServer({ store })
  const server = new McpServer({ name: 'offprompt', version: 'test' }, { capabilities: { tools: {} } })
  const openUrl = vi.fn<(url: string) => Promise<boolean>>(() => Promise.resolve(true))
  const tunnelUrl = vi.fn(() => Promise.resolve(tunnelComesUp ? TUNNEL : undefined))
  const present = createPresenter({ server: server.server, loopback, tunnelUrl, openUrl, settleMs: 10 })
  registerTools({ server, store, loopback, present, project: () => Promise.resolve(ok(workspace.root)), where })
  /** The page as served on the loopback, whatever address the link carried. */
  const pageOf = async (link: string) => {
    const { pathname } = new URL(link)
    return (await fetch(`${loopback.origin}${pathname}`)).text()
  }

  const client = new Client(
    { name: 'test-client', version: 'test' },
    { capabilities: elicitation ? { elicitation: { url: {} } } : {} },
  )
  if (elicitation) client.setRequestHandler(ElicitRequestSchema, () => ({ action: 'accept' as const }))
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
  await Promise.all([client.connect(clientTransport), server.connect(serverTransport)])

  teardowns.push(async () => {
    await client.close()
    await server.close()
    await loopback.close()
    await workspace.cleanup()
  })

  const collect = async (overrides: Record<string, unknown> = {}) => {
    const result = await client.callTool({
      name: 'collect_secret',
      arguments: {
        secrets: [{ name: 'RESEND_API_KEY', provider: 'resend' }],
        reason: 'The email sender reads it via dotenv at startup',
        sink: { kind: 'dotenv', path: '.env' },
        ...overrides,
      },
    })
    return result.structuredContent as Answer
  }

  /** What the human does with the link: open it, type, and press Write it. */
  const writeThrough = async ({ link, value }: { link: string; value: string }) => {
    const { pathname, hash } = new URL(link)
    const token = pathname.split('/').at(-1) ?? ''
    const request = store.byToken(token)
    if (request === undefined) throw new Error('the link names no request')
    const sealer = await sealerFor({ hash, token, nonce: request.nonce })
    if (typeof sealer === 'string') throw new Error(sealer)
    const sealed = await sealer(plaintextFor({ values: new Map([['value0', value]]), allowTracked: false }))
    return fetch(loopback.urlFor(request), {
      method: 'POST',
      body: new URLSearchParams({ nonce: request.nonce, sealed }),
    })
  }

  const awaitSecret = async (requestId: string) => {
    const result = await client.callTool({ name: 'await_secret', arguments: { request_id: requestId } })
    return result.structuredContent as Answer
  }

  return { ...workspace, collect, writeThrough, awaitSecret, openUrl, tunnelUrl, loopback, store, pageOf }
}

afterEach(async () => {
  await Promise.all(teardowns.splice(0).map(teardown => teardown()))
  vi.unstubAllEnvs()
})

describe('collect_secret from a sandbox', () => {
  it('answers at once with the tunnel link, its key after the #, and thirty minutes to use it', async () => {
    const { collect, openUrl } = await setupTest()

    const answer = await collect()

    expect(answer.status).toBe('awaiting')
    expect(answer.url).toMatch(new RegExp(`^${TUNNEL}/r/[0-9a-f]{32}#k=[\\w-]{87}$`))
    expect(answer.expires_in).toBe(1800)
    expect(answer.note).toBe(
      `offprompt is running in a cloud sandbox and exposed its page through a tunnel. Show the user this link in your reply, on its own line, and tell them to open it and type the values there. Nothing happens until they do: ${answer.url ?? ''} Say nothing else about it. Then call await_secret.`,
    )
    expect(openUrl).not.toHaveBeenCalled()
  })

  it('lands the write once the human uses the link, and await_secret says so', async () => {
    const { collect, writeThrough, awaitSecret, read } = await setupTest()
    const answer = await collect()

    const response = await writeThrough({ link: answer.url ?? '', value: RESEND_KEY })
    const settled = await awaitSecret(answer.request_id)

    expect(response.status).toBe(200)
    expect(settled.status).toBe('written')
    expect(await read('.env')).toBe(`RESEND_API_KEY=${RESEND_KEY}\n`)
  })

  it('shows the same four emoji on the Saved page and in the result', async () => {
    const { collect, writeThrough, awaitSecret } = await setupTest()
    const answer = await collect()

    const saved = await (await writeThrough({ link: answer.url ?? '', value: RESEND_KEY })).text()
    const settled = await awaitSecret(answer.request_id)

    expect(settled.emoji).toBeDefined()
    expect(saved).toContain(`<ul class="emoji" aria-label="${settled.emoji ?? ''}">`)
  })

  it('tells the agent every key the file holds, and not to open it', async () => {
    const { collect, writeThrough, awaitSecret, write } = await setupTest()
    await write('.env', 'PORT=3000\nEXPO_PUBLIC_API_URL=https://api.example\n')
    const answer = await collect()
    await writeThrough({ link: answer.url ?? '', value: RESEND_KEY })

    const settled = await awaitSecret(answer.request_id)

    expect(settled.status).toBe('written')
    expect(settled.file_keys).toEqual(['PORT', 'EXPO_PUBLIC_API_URL', 'RESEND_API_KEY'])
    expect(settled.emoji).toMatch(/^\S+ \S+ \S+ \S+$/u)
    expect(settled.note).toBe(
      `Write this to the user now, before your next tool call, on a line of its own: "Fingerprint ${settled.emoji ?? ''}". They are matching it against the four on their page while it is still open, so it cannot wait for the end of your task or for your next call to offprompt, and a fingerprint only in your reasoning never reaches them. RESEND_API_KEY is in .env. Read it from the environment by name. The file now holds PORT, EXPO_PUBLIC_API_URL, RESEND_API_KEY. Do not open, cat, grep or print .env: reading it puts the values into the transcript. Nothing needs checking; the write was atomic and every value passed its checks.`,
    )
    expect(JSON.stringify(settled)).not.toContain(RESEND_KEY)
    expect(JSON.stringify(settled)).not.toContain('3000')
  })

  it('hands out the loopback link, and says what it depends on, when no tunnel comes up', async () => {
    const { collect, loopback } = await setupTest({ tunnelComesUp: false })

    const answer = await collect()

    expect(answer.status).toBe('awaiting')
    expect(answer.url).toMatch(new RegExp(`^${loopback.origin}/r/[0-9a-f]{32}#k=[\\w-]{87}$`))
    expect(answer.note).toBe(
      `offprompt could not open a tunnel from this sandbox. Show the user this link in your reply, on its own line, and tell them to open it and type the values there. Nothing happens until they do: ${answer.url ?? ''} It opens only if their tool forwards port ${String(loopback.port)} to their machine; if it forwards to another port, they change the port in the link. If nothing forwards it, this sandbox cannot expose a page: they can turn on port forwarding or allow outbound connections to Cloudflare, then ask you to try again. Then call await_secret.`,
    )
  })

  it('leaves a tunnel link the host is showing out of the result, and still does not wait', async () => {
    const { collect } = await setupTest({ elicitation: true })

    const answer = await collect()

    expect(answer.status).toBe('awaiting')
    expect(answer.url).toBeUndefined()
    expect(answer.note).toBe(
      'offprompt is running in a cloud sandbox and exposed its page through a tunnel. The host is showing the user the link. Call await_secret.',
    )
  })

  it('writes generated keys at once, with no tunnel', async () => {
    const { collect, tunnelUrl, read } = await setupTest()

    const answer = await collect({ secrets: [{ name: 'AUTH_SECRET', generate: {} }] })

    expect(answer.status).toBe('written')
    expect(tunnelUrl).not.toHaveBeenCalled()
    expect(await read('.env')).toMatch(/^AUTH_SECRET=[\w-]{43}\n$/)
  })
})

describe('who is asking', () => {
  it('names the host that connected, on the page', async () => {
    // Pinned, since the suite may itself run inside Conductor, which would add ", in Conductor".
    vi.stubEnv('CONDUCTOR_WORKSPACE_ID', '')
    const { collect, pageOf } = await setupTest()
    const answer = await collect()
    const html = await pageOf(answer.url ?? '')
    // The in-memory test client introduces itself as test-client, which no list knows.
    expect(html).toContain('<span class="agent">test-client</span>')
    expect(html).toContain('<h1>test-client is asking for one value.</h1>')
  })
})

describe('collect_secret when the agent says it runs in a sandbox', () => {
  it('takes the remote path where the environment cannot tell, as on Linux with a display', async () => {
    const { collect, openUrl } = await setupTest({ where: 'unsure' })

    const answer = await collect({ sandbox: true })

    expect(answer.url).toMatch(/#k=[\w-]{87}$/)
    expect(answer.expires_in).toBe(1800)
    expect(openUrl).not.toHaveBeenCalled()
  })

  it('opens the page here all the same on a Mac or Windows machine with no sign of a remote one', async () => {
    const { collect, openUrl, tunnelUrl, store } = await setupTest({ where: 'local' })

    const pending = collect({ sandbox: true })
    await vi.waitFor(() => expect(openUrl).toHaveBeenCalled())
    const opened = openUrl.mock.calls.at(-1)?.[0] ?? ''
    const request = store.byToken(opened.split('/r/').at(-1) ?? '')

    expect(opened).toMatch(/^http:\/\/127\.0\.0\.1:\d+\/r\/[0-9a-f]{32}$/)
    expect(tunnelUrl).not.toHaveBeenCalled()
    expect(request?.remote).toBe(false)
    if (request !== undefined) store.expire(request.id)
    await pending.catch(() => undefined)
  })
})

describe('collect_secret on the human\'s own machine', () => {
  it('opens the browser on a link with no key, starts no tunnel, and keeps the five minutes', async () => {
    const { collect, openUrl, tunnelUrl, store } = await setupTest({ where: 'unsure' })

    const pending = collect()
    await vi.waitFor(() => expect(openUrl).toHaveBeenCalled())
    const opened = openUrl.mock.calls.at(-1)?.[0] ?? ''
    const request = store.byToken(opened.split('/r/').at(-1) ?? '')
    if (request === undefined) throw new Error('the opened page names no request')

    expect(opened).toMatch(/^http:\/\/127\.0\.0\.1:\d+\/r\/[0-9a-f]{32}$/)
    expect(tunnelUrl).not.toHaveBeenCalled()
    expect(request.remote).toBe(false)
    expect(store.expiresInSeconds(request)).toBe(300)

    store.expire(request.id)
    await pending
  })
})
