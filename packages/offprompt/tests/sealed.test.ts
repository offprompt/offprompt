import { afterEach, describe, expect, it } from 'vitest'

import { fromBase64Url, newSealPair, toBase64Url } from '../src/core/sealing.js'
import { resolveSink } from '../src/core/sinks.js'
import { createRequestStore, type SecretRequest } from '../src/core/store.js'
import { requestedSecrets } from '../src/mcp/requested.js'
import { MISSING_KEY, NO_WEBCRYPTO, plaintextFor, sealerFor } from '../src/web/client/seal.js'
import { startLoopbackServer } from '../src/web/server.js'
import { setupWorkspace } from './helpers/workspace.js'

const teardowns: (() => Promise<void>)[] = []

const RESEND_KEY = `re_${'a'.repeat(30)}`

const OUT_OF_DATE = 'This page is out of date.'

const setupTest = async ({ names = ['RESEND_API_KEY'], tracked = false } = {}) => {
  const workspace = await setupWorkspace({ git: tracked })
  if (tracked) {
    await workspace.write('.env', '')
    await workspace.track('.env')
  }
  const store = createRequestStore()
  const server = await startLoopbackServer({ store })
  teardowns.push(async () => {
    await server.close()
    await workspace.cleanup()
  })

  const sink = await resolveSink({ root: workspace.root, spec: { kind: 'dotenv', path: '.env' } })
  if (!sink.ok) throw new Error(sink.message)
  const secrets = await requestedSecrets({ sink: sink.value, asks: names.map(name => ({ name, format: 'text' })) })
  if (!secrets.ok) throw new Error(secrets.message)

  const open = async () => {
    const pair = await newSealPair()
    const request = store.create({ secrets: secrets.value, reason: 'needed', sink: sink.value, sealKey: pair.sealKey })
    return { request, publicKey: pair.publicKey }
  }
  const { request, publicKey } = await open()

  /** What the page does on Write it, under Node's WebCrypto. */
  const sealFor = async ({
    target = request,
    key = publicKey,
    nonce = target.nonce,
    values = { value0: RESEND_KEY },
    allowTracked = false,
  }: {
    target?: SecretRequest
    key?: string
    nonce?: string
    values?: Record<string, string>
    allowTracked?: boolean
  } = {}) => {
    const sealer = await sealerFor({ hash: `#k=${key}`, token: target.token, nonce })
    if (typeof sealer === 'string') throw new Error(sealer)
    return sealer(plaintextFor({ values: new Map(Object.entries(values)), allowTracked }))
  }

  const post = (fields: Record<string, string>, target = request) =>
    fetch(server.urlFor(target), { method: 'POST', body: new URLSearchParams(fields) })

  const postSealed = (sealed: string, target = request) => post({ nonce: target.nonce, sealed }, target)

  return { ...workspace, store, server, request, publicKey, open, sealFor, post, postSealed }
}

/** The sealed value with one byte of one part flipped. */
const flipped = ({ sealed, part }: { sealed: string; part: 1 | 2 | 3 }) => {
  const parts = sealed.split('.')
  const bytes = fromBase64Url(parts[part] ?? '')
  const tampered = bytes.map((byte, index) => (index === bytes.length - 1 ? byte ^ 1 : byte))
  return parts.map((value, index) => (index === part ? toBase64Url(tampered) : value)).join('.')
}

afterEach(async () => {
  await Promise.all(teardowns.splice(0).map(teardown => teardown()))
})

describe('a sealed submission', () => {
  it('opens in the server and writes the same values', async () => {
    const { sealFor, postSealed, read, store, request } = await setupTest({ names: ['A_KEY', 'B_KEY'] })

    const sealed = await sealFor({ values: { value0: 'first value', value1: 'second=value' } })
    const response = await postSealed(sealed)

    expect(response.status).toBe(200)
    expect(await response.text()).toContain('<h1 tabindex="-1">Written.</h1>')
    expect(await read('.env')).toBe("A_KEY='first value'\nB_KEY=second=value\n")
    expect(store.get(request.id)?.status).toBe('written')
  })

  it('carries no plaintext', async () => {
    const { sealFor } = await setupTest()
    const sealed = await sealFor()

    expect(sealed).toMatch(/^v1\.[\w-]{87}\.[\w-]{16}\.[\w-]+$/)
    expect(sealed).not.toContain(RESEND_KEY)
    expect(Buffer.from(sealed.split('.')[3] ?? '', 'base64url').toString('latin1')).not.toContain(RESEND_KEY)
  })

  it('carries the override for a tracked file inside the seal', async () => {
    const { sealFor, postSealed, read } = await setupTest({ tracked: true })

    const refused = await postSealed(await sealFor())
    expect(refused.status).toBe(422)

    const allowed = await postSealed(await sealFor({ allowTracked: true }))
    expect(allowed.status).toBe(200)
    expect(await read('.env')).toContain(RESEND_KEY)
  })

  it('redraws the rule lines of a value that fails, and never the value', async () => {
    const { sealFor, postSealed, exists } = await setupTest()

    const response = await postSealed(await sealFor({ values: { value0: '' } }))

    expect(response.status).toBe(422)
    expect(await response.text()).toContain('Required. The agent asked for this one.')
    expect(await exists('.env')).toBe(false)
  })
})

describe('a sealed value that does not open', () => {
  it.each([
    ['the page key', 1],
    ['the IV', 2],
    ['the ciphertext', 3],
  ] as const)('is refused with a flipped byte in %s', async (_, part) => {
    const { sealFor, postSealed, exists } = await setupTest()

    const response = await postSealed(flipped({ sealed: await sealFor(), part }))

    expect(response.status).toBe(403)
    expect(await response.text()).toContain(OUT_OF_DATE)
    expect(await exists('.env')).toBe(false)
  })

  it('is refused when it was sealed for another request', async () => {
    const { open, sealFor, postSealed, exists } = await setupTest()
    const other = await open()

    // Sealed to this request's key, but bound to the other one's token.
    const sealed = await sealFor({ target: { ...other.request, nonce: other.request.nonce } })
    const response = await postSealed(sealed)

    expect(response.status).toBe(403)
    expect(await exists('.env')).toBe(false)
  })

  it('is refused when it was sealed on another page load', async () => {
    const { sealFor, postSealed, exists } = await setupTest()

    const response = await postSealed(await sealFor({ nonce: 'f'.repeat(32) }))

    expect(response.status).toBe(403)
    expect(await exists('.env')).toBe(false)
  })

  it('is refused when it was sealed to another key', async () => {
    const { sealFor, postSealed } = await setupTest()
    const stranger = await newSealPair()

    const response = await postSealed(await sealFor({ key: stranger.publicKey }))

    expect(response.status).toBe(403)
  })

  it.each(['v2.a.b.c', 'v1.a.b', 'v1.a.b.c.d', 'not sealed at all', ''])('is refused as %j', async sealed => {
    const { postSealed } = await setupTest()
    const response = await postSealed(sealed)
    expect(response.status).toBe(403)
  })

  it('is refused when it opens but holds no submission', async () => {
    const { request, publicKey, postSealed, store, exists } = await setupTest()
    const sealer = await sealerFor({ hash: `#k=${publicKey}`, token: request.token, nonce: request.nonce })
    if (typeof sealer === 'string') throw new Error(sealer)

    const response = await postSealed(await sealer('["values", "allowTracked"]'))

    expect(response.status).toBe(403)
    expect(store.get(request.id)?.status).toBe('awaiting')
    expect(await exists('.env')).toBe(false)
  })

  it('says the same thing as a bad nonce, and never which part failed', async () => {
    const { sealFor, post, postSealed } = await setupTest()
    const sealed = await sealFor()

    const badNonce = await post({ nonce: '0'.repeat(32), sealed })
    const badSeal = await postSealed(flipped({ sealed, part: 3 }))

    // Each response carries its own CSP nonce, and nothing else tells the two apart.
    const withoutCspNonce = (html: string) => html.replace(/nonce="[0-9a-f]{32}"/g, '')
    expect(badNonce.status).toBe(403)
    expect(withoutCspNonce(await badSeal.text())).toBe(withoutCspNonce(await badNonce.text()))
  })
})

describe('key disposal', () => {
  it.each([
    ['written', (store: ReturnType<typeof createRequestStore>, id: string) => store.markWritten(id)],
    ['cancelled', (store: ReturnType<typeof createRequestStore>, id: string) => store.expire(id)],
  ] as const)('drops the private key once the request is %s', async (_, close) => {
    const { store, request } = await setupTest()
    expect(store.get(request.id)?.sealKey).toBeDefined()

    close(store, request.id)

    expect(store.get(request.id)?.sealKey).toBeUndefined()
  })

  it('drops the private key when the request expires', async () => {
    const workspace = await setupWorkspace()
    teardowns.push(workspace.cleanup)
    const sink = await resolveSink({ root: workspace.root, spec: { kind: 'dotenv', path: '.env' } })
    if (!sink.ok) throw new Error(sink.message)
    const now = { ms: 0 }
    const store = createRequestStore({ clock: () => now.ms })
    const pair = await newSealPair()
    const request = store.create({ secrets: [], reason: 'needed', sink: sink.value, sealKey: pair.sealKey })

    now.ms = 30 * 60_000 + 1

    expect(store.get(request.id)).toMatchObject({ status: 'expired', remote: true })
    expect(store.get(request.id)?.sealKey).toBeUndefined()
  })

  it('refuses a sealed value that arrives after its request closed', async () => {
    const { sealFor, postSealed, store, request, exists } = await setupTest()
    const sealed = await sealFor()
    store.expire(request.id)

    const response = await postSealed(sealed)

    expect(response.status).toBe(403)
    expect(await response.text()).toContain(OUT_OF_DATE)
    expect(await exists('.env')).toBe(false)
  })
})

describe('a plain submission to a remote request', () => {
  it('is refused without a sealed field', async () => {
    const { post, request, exists } = await setupTest()

    const response = await post({ nonce: request.nonce, value0: RESEND_KEY })

    expect(response.status).toBe(400)
    expect(await response.text()).toContain('This page needs JavaScript to send values safely.')
    expect(await exists('.env')).toBe(false)
  })

  it('is refused when it carries value fields beside the sealed one', async () => {
    const { post, sealFor, request, exists } = await setupTest()

    const response = await post({ nonce: request.nonce, sealed: await sealFor(), value0: RESEND_KEY })

    expect(response.status).toBe(400)
    expect(await exists('.env')).toBe(false)
  })

  it('is refused when it carries the fingerprint key in the clear, where the tunnel could read it', async () => {
    const { post, sealFor, request, exists } = await setupTest()

    const response = await post({ nonce: request.nonce, sealed: await sealFor(), fingerprint: 'k'.repeat(43) })

    expect(response.status).toBe(400)
    expect(await exists('.env')).toBe(false)
  })

  it('is refused as a native multipart submission', async () => {
    const { server, request, exists } = await setupTest()
    const body = new FormData()
    body.set('nonce', request.nonce)
    body.set('value0', RESEND_KEY)

    const response = await fetch(server.urlFor(request), { method: 'POST', body })

    expect(response.status).toBe(400)
    expect(await exists('.env')).toBe(false)
  })
})

describe('the remote page', () => {
  it('marks its form as sealed, keeps Write it off until the script is ready, and says what it does', async () => {
    const { server, request } = await setupTest()
    const html = await (await fetch(server.urlFor(request))).text()

    expect(html).toMatch(/<form [^>]*data-sealed/)
    expect(html).toMatch(/<button type="submit" class="primary" data-submit disabled>/)
    expect(html).toContain('Values are encrypted in this browser. Only the agent&#39;s sandbox can read them.')
    expect(html).toContain('<noscript>')
    expect(html).toContain('This page needs JavaScript</p><p>It encrypts your values before they leave this browser.')
  })

  it('leaves a local page exactly as it was', async () => {
    const { server, store, request } = await setupTest()
    const local = store.create({ secrets: request.secrets, reason: 'needed', sink: request.sink })
    const html = await (await fetch(server.urlFor(local))).text()

    expect(html).not.toMatch(/<form [^>]*data-sealed/)
    expect(html).not.toContain('<noscript>')
    expect(html).not.toContain('encrypted in this browser')
    expect(html).toContain('<button type="submit" class="primary" data-submit>')
  })
})

describe('the key in the link', () => {
  it('is an 87-character public key', async () => {
    const { publicKey } = await setupTest()
    expect(publicKey).toMatch(/^[\w-]{87}$/)
  })

  it.each(['', '#', '#k=', '#k=not-a-key', `#k=${'A'.repeat(87)}`, '#other=1'])(
    'keeps a page whose link reads %j from sealing',
    async hash => {
      expect(await sealerFor({ hash, token: '0'.repeat(32), nonce: '1'.repeat(32) })).toBe(MISSING_KEY)
    },
  )

  it('says so when the browser has no WebCrypto', async () => {
    const original = Object.getOwnPropertyDescriptor(globalThis, 'crypto')
    Object.defineProperty(globalThis, 'crypto', { value: undefined, configurable: true })
    try {
      expect(await sealerFor({ hash: '#k=abc', token: '0'.repeat(32), nonce: '1'.repeat(32) })).toBe(NO_WEBCRYPTO)
    } finally {
      if (original !== undefined) Object.defineProperty(globalThis, 'crypto', original)
    }
  })
})
