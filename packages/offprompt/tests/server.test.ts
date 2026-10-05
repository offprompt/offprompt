import { mkdir } from 'node:fs/promises'
import { request as httpRequest } from 'node:http'
import { join } from 'node:path'
import { text as readText } from 'node:stream/consumers'
import { afterEach, describe, expect, it } from 'vitest'

import { chmod } from 'node:fs/promises'

import { fingerprintOf } from '../src/core/fingerprint.js'
import { resolveSink, type SinkKind } from '../src/core/sinks.js'
import { createRequestStore, DEFAULT_TTL_MS, type SecretRequest, type TypedValue } from '../src/core/store.js'
import { requestedSecrets, type AskedSecret } from '../src/mcp/requested.js'
import { fromAnotherPage, startLoopbackServer } from '../src/web/server.js'
import { setupWorkspace, WRITTEN_MODE } from './helpers/workspace.js'

type Teardown = () => Promise<void>

/** `fetch` refuses to set Host or Sec-Fetch-Site, so those checks go through node:http. */
const rawRequest = ({
  port,
  path,
  headers,
  method = 'GET',
  body,
}: {
  port: string
  path: string
  headers: Record<string, string>
  method?: string
  body?: string
}) =>
  new Promise<{ status: number | undefined; body: string }>((resolve, reject) => {
    const payload = body === undefined ? undefined : Buffer.from(body, 'utf8')
    const outgoing = httpRequest(
      {
        host: '127.0.0.1',
        port,
        path,
        method,
        headers:
          payload === undefined
            ? headers
            : {
                'content-type': 'application/x-www-form-urlencoded',
                'content-length': String(payload.byteLength),
                ...headers,
              },
      },
      incoming => {
        void readText(incoming).then(bodyText => resolve({ status: incoming.statusCode, body: bodyText }))
      },
    )
    outgoing.once('error', reject)
    outgoing.end(payload)
  })

const teardowns: Teardown[] = []

const RESEND_KEY = `re_${'a'.repeat(30)}`

const PLAIN: TypedValue = { kind: 'typed', rules: [], multiline: false, masked: true, offers: [] }

/** The page as text with its icons taken out, so an assertion reads the words and the structure. */
const withoutIcons = (html: string) => html.replace(/<svg class="icon[^"]*"[^>]*><use href="#i-[a-z-]+"\/><\/svg>/g, '')

const setupTest = async ({
  names = ['RESEND_API_KEY'],
  reason = 'The email sender reads it via dotenv at startup',
  ask = { provider: 'resend' },
  sinkPath = '.env',
  sinkKind = 'dotenv',
  git = false,
  files = {},
  tracked = [],
  ttlMs = DEFAULT_TTL_MS,
}: {
  names?: readonly string[]
  reason?: string
  ask?: Omit<AskedSecret, 'name'>
  sinkPath?: string
  sinkKind?: SinkKind
  git?: boolean
  files?: Readonly<Record<string, string>>
  tracked?: readonly string[]
  ttlMs?: number
} = {}) => {
  const workspace = await setupWorkspace({ git })
  await Promise.all(Object.entries(files).map(([path, contents]) => workspace.write(path, contents)))
  await Promise.all(tracked.map(path => workspace.track(path)))

  const store = createRequestStore({ ttlMs })
  const written: SecretRequest[] = []
  const server = await startLoopbackServer({ store, onWritten: request => void written.push(request) })
  teardowns.push(async () => {
    await server.close()
    await workspace.cleanup()
  })

  const sink = await resolveSink({ root: workspace.root, spec: { kind: sinkKind, path: sinkPath } })
  if (!sink.ok) throw new Error(sink.message)
  const secrets = await requestedSecrets({ sink: sink.value, asks: names.map(name => ({ name, ...ask })) })
  if (!secrets.ok) throw new Error(secrets.message)
  const request = store.create({ secrets: secrets.value, reason, sink: sink.value })
  const url = server.urlFor(request)

  const get = (target = url, init: RequestInit = {}) => fetch(target, init)

  const post = (body: FormData | URLSearchParams, init: RequestInit = {}) =>
    fetch(url, { method: 'POST', body, redirect: 'manual', ...init })

  const submit = (fields: Record<string, string>) =>
    post(new URLSearchParams({ nonce: request.nonce, ...fields }))

  const submitValue = (value: string, extra: Record<string, string> = {}) =>
    submit({ value0: value, ...extra })

  return { ...workspace, store, server, request, url, get, post, submit, submitValue, written }
}

afterEach(async () => {
  await Promise.all(teardowns.splice(0).map(teardown => teardown()))
})

it('serves the form with the intent rendered from the record', async () => {
  const { get, request } = await setupTest()
  const response = await get()
  const html = await response.text()

  expect(response.status).toBe(200)
  expect(html).toContain('RESEND_API_KEY')
  expect(html).toContain('The email sender reads it via dotenv at startup')
  expect(html).toContain('The agent is asking for one value.')
  expect(html).toContain('starts with re_')
  expect(html).toContain(request.sink.absolutePath)
  expect(html).toContain('not gitignored')
})

it('escapes the agent reason so it cannot inject markup', async () => {
  const { get } = await setupTest({ reason: '<img src=x onerror="alert(1)">' })
  const html = await (await get()).text()

  expect(html).not.toContain('<img src=x')
  expect(html).toContain('&lt;img src=x onerror=&quot;alert(1)&quot;&gt;')
})

it('sends a content security policy that blocks scripts and network loads', async () => {
  const { get } = await setupTest()
  const response = await get()
  const policy = response.headers.get('content-security-policy') ?? ''

  expect(policy).toContain("default-src 'none'")
  expect(policy).toMatch(/style-src 'nonce-[0-9a-f]{32}'/)
  expect(policy).toContain("form-action 'self'")
  expect(response.headers.get('cache-control')).toContain('no-store')
  expect(response.headers.get('referrer-policy')).toBe('no-referrer')
  expect(response.headers.get('access-control-allow-origin')).toBeNull()
})

it('raises no warning over a gitignored sink', async () => {
  const { get } = await setupTest({ git: true, files: { '.gitignore': '.env\n' } })
  const html = await (await get()).text()
  expect(html).toContain('<span class="state">new file</span>')
  expect(html).not.toContain('not gitignored')
})

it('says the file exists and the key is already set when it is', async () => {
  const { get } = await setupTest({ files: { '.env': 'RESEND_API_KEY=old\n' } })
  const html = await (await get()).text()
  expect(html).toContain('<span class="state warn">exists · 1 key already set · not gitignored</span>')
  expect(html).toContain('Already in .env. Writing will replace the current value.')
})

it('writes the value, closes the record and never echoes the value back', async () => {
  const { submitValue, read, modeOf, store, request, written } = await setupTest()
  expect(store.get(request.id)?.status).toBe('awaiting')

  const response = await submitValue(RESEND_KEY)
  const html = await response.text()

  expect(response.status).toBe(200)
  expect(html).not.toContain(RESEND_KEY)
  expect(html).toContain('written')
  expect(await read('.env')).toBe(`RESEND_API_KEY=${RESEND_KEY}\n`)
  expect(await modeOf('.env')).toBe(WRITTEN_MODE)
  expect(store.get(request.id)?.status).toBe('written')
  expect(written.map(record => record.id)).toEqual([request.id])
})

it('refuses to serve the page again once the value has been written', async () => {
  const { submitValue, get } = await setupTest()
  await submitValue(RESEND_KEY)

  const response = await get()
  expect(response.status).toBe(410)
  expect(await response.text()).toContain('closed')
})

it('keeps the request open and marks the rule a value broke', async () => {
  const { submitValue, store, request, exists } = await setupTest()
  const response = await submitValue('sk_live_wrong_provider_key_here')
  const html = await response.text()

  expect(response.status).toBe(422)
  expect(withoutIcons(html)).toContain('<li data-rule="0" class="fail"><span>starts with re_</span></li>')
  expect(store.get(request.id)?.status).toBe('awaiting')
  expect(await exists('.env')).toBe(false)
})

it('keeps the request open however many times a value fails', async () => {
  const { submitValue, store, request, read } = await setupTest()
  const failures = await Promise.all(Array.from({ length: 5 }, () => submitValue('no')))
  expect(failures.map(response => response.status)).toEqual([422, 422, 422, 422, 422])
  expect(store.get(request.id)?.status).toBe('awaiting')

  const written = await submitValue(RESEND_KEY)

  expect(written.status).toBe(200)
  expect(await read('.env')).toBe(`RESEND_API_KEY=${RESEND_KEY}\n`)
})

it('rejects a submission whose nonce does not match the page', async () => {
  const { post, store, request, exists } = await setupTest()
  const response = await post(new URLSearchParams({ nonce: '0'.repeat(32), value0: RESEND_KEY }))

  expect(response.status).toBe(403)
  expect(await exists('.env')).toBe(false)
  expect(store.get(request.id)?.status).toBe('awaiting')
})

it('rejects a submission with no nonce at all', async () => {
  const { post, exists } = await setupTest()
  const response = await post(new URLSearchParams({ value0: RESEND_KEY }))
  expect(response.status).toBe(403)
  expect(await exists('.env')).toBe(false)
})

it('answers to the loopback under either of its names, on any port', async () => {
  const { url } = await setupTest()
  const target = new URL(url)
  const statusFor = async (host: string) =>
    (await rawRequest({ port: target.port, path: target.pathname, headers: { host } })).status

  expect(await statusFor(`127.0.0.1:${target.port}`)).toBe(200)
  expect(await statusFor(`localhost:${target.port}`)).toBe(200)
  // Port forwarding may carry the page to the human under another number.
  expect(await statusFor('127.0.0.1:52143')).toBe(200)
  expect(await statusFor('localhost:52143')).toBe(200)
})

it('rejects a Host that only looks like the loopback', async () => {
  const { url } = await setupTest()
  const target = new URL(url)
  const statusFor = async (host: string) =>
    (await rawRequest({ port: target.port, path: target.pathname, headers: { host } })).status

  expect(await statusFor('evil.example')).toBe(421)
  expect(await statusFor(`127.0.0.1.evil.example:${target.port}`)).toBe(421)
  expect(await statusFor('localhost.evil.example')).toBe(421)
})

it('answers to the tunnel host only while a tunnel is up', async () => {
  const { url, server } = await setupTest()
  const target = new URL(url)
  const statusFor = async (host: string) =>
    (await rawRequest({ port: target.port, path: target.pathname, headers: { host } })).status

  expect(await statusFor('some-words.trycloudflare.com')).toBe(421)
  server.answerTo('some-words.trycloudflare.com')
  expect(await statusFor('some-words.trycloudflare.com')).toBe(200)
  expect(await statusFor('other-words.trycloudflare.com')).toBe(421)
  server.answerTo(undefined)
  expect(await statusFor('some-words.trycloudflare.com')).toBe(421)
})

it('rejects a request whose Host header names a domain that resolves to the loopback', async () => {
  const { url } = await setupTest()
  const target = new URL(url)
  const rebound = await rawRequest({
    port: target.port,
    path: target.pathname,
    headers: { host: 'attacker.example' },
  })
  expect(rebound.status).toBe(421)
})

it('rejects a request sent from a page on another origin', async () => {
  const { post, exists } = await setupTest()
  const response = await post(new URLSearchParams({ value0: RESEND_KEY }), {
    headers: { origin: 'https://evil.example' },
  })
  expect(response.status).toBe(403)
  expect(await exists('.env')).toBe(false)
})

it('accepts the headers a browser actually sends for its own form submission', async () => {
  const { url, request, read } = await setupTest()
  const target = new URL(url)

  const submitted = await rawRequest({
    port: target.port,
    path: target.pathname,
    method: 'POST',
    // A page served with Referrer-Policy: no-referrer submits with Origin: null.
    headers: {
      host: `127.0.0.1:${target.port}`,
      origin: 'null',
      'sec-fetch-site': 'same-origin',
      'sec-fetch-mode': 'navigate',
      'sec-fetch-dest': 'document',
    },
    body: new URLSearchParams({ nonce: request.nonce, value0: RESEND_KEY }).toString(),
  })

  expect(submitted.status).toBe(200)
  expect(await read('.env')).toBe(`RESEND_API_KEY=${RESEND_KEY}\n`)
})

it('rejects a submission from another page on the same host but a different port', async () => {
  const { url, request, exists } = await setupTest()
  const target = new URL(url)

  const submitted = await rawRequest({
    port: target.port,
    path: target.pathname,
    method: 'POST',
    headers: {
      host: `127.0.0.1:${target.port}`,
      origin: `http://127.0.0.1:${Number(target.port) + 1}`,
      'sec-fetch-site': 'same-site',
    },
    body: new URLSearchParams({ nonce: request.nonce, value0: RESEND_KEY }).toString(),
  })

  expect(submitted.status).toBe(403)
  expect(await exists('.env')).toBe(false)
})

describe('fromAnotherPage', () => {
  const origin = '127.0.0.1:4321'

  it('trusts a same-origin fetch metadata label', () => {
    expect(fromAnotherPage({ headers: { 'sec-fetch-site': 'same-origin', origin: 'null' } })).toBe(false)
  })

  it('trusts a request the user started themselves', () => {
    expect(fromAnotherPage({ headers: { 'sec-fetch-site': 'none' } })).toBe(false)
  })

  it('refuses a cross-site request even when its Origin header is missing', () => {
    expect(fromAnotherPage({ headers: { 'sec-fetch-site': 'cross-site' } })).toBe(true)
  })

  it('refuses a same-site request from another port', () => {
    expect(fromAnotherPage({ headers: { 'sec-fetch-site': 'same-site' } })).toBe(true)
  })

  it('falls back to the Origin header when fetch metadata is absent', () => {
    expect(fromAnotherPage({ headers: { origin: `http://${origin}` } })).toBe(false)
    expect(fromAnotherPage({ headers: { origin: 'http://localhost:52143' } })).toBe(false)
    expect(fromAnotherPage({ headers: { origin: 'https://evil.example' } })).toBe(true)
    expect(fromAnotherPage({ headers: { origin: 'http://127.0.0.1.evil.example' } })).toBe(true)
  })

  it('takes the tunnel for its own origin only while one is up', () => {
    const tunnelled = { origin: 'https://some-words.trycloudflare.com' }
    expect(fromAnotherPage({ headers: tunnelled })).toBe(true)
    expect(fromAnotherPage({ headers: tunnelled, tunnelHost: 'some-words.trycloudflare.com' })).toBe(false)
    expect(fromAnotherPage({ headers: tunnelled, tunnelHost: 'other-words.trycloudflare.com' })).toBe(true)
  })

  it('has nothing to go on when neither header is sent', () => {
    expect(fromAnotherPage({ headers: {} })).toBe(false)
  })
})

it('answers a preflight with no CORS headers', async () => {
  const { get, url } = await setupTest()
  const response = await get(url, {
    method: 'OPTIONS',
    headers: { origin: `http://127.0.0.1:${new URL(url).port}` },
  })
  expect(response.status).toBe(405)
  expect(response.headers.get('access-control-allow-origin')).toBeNull()
  expect(response.headers.get('access-control-allow-methods')).toBeNull()
})

it('answers an unknown token the same way as a missing page', async () => {
  const { server } = await setupTest()
  const response = await fetch(`${server.origin}/r/${'0'.repeat(32)}`)
  expect(response.status).toBe(404)
  expect(await response.text()).toContain('Nothing here')
})

it('answers a path outside the request route as a missing page', async () => {
  const { server } = await setupTest()
  expect((await fetch(`${server.origin}/`)).status).toBe(404)
  expect((await fetch(`${server.origin}/r/../etc/passwd`)).status).toBe(404)
})

it('offers another attempt for a body larger than the cap, and writes nothing', async () => {
  const { post, exists, store, request } = await setupTest()
  const response = await post(new URLSearchParams({ value: 'x'.repeat(70_000) }))

  expect(response.status).toBe(422)
  expect(await response.text()).toContain('too large to read')
  expect(await exists('.env')).toBe(false)
  expect(store.get(request.id)?.status).toBe('awaiting')
})

it('answers a nonce that is not the right number of bytes without crashing', async () => {
  const { post, exists, store, request } = await setupTest()
  const response = await post(new URLSearchParams({ nonce: 'é'.repeat(32), value0: RESEND_KEY }))

  expect(response.status).toBe(403)
  expect(await exists('.env')).toBe(false)
  expect(store.get(request.id)?.status).toBe('awaiting')
})

it('writes once when the same page is submitted twice at the same moment', async () => {
  const { url, request, read, store } = await setupTest()
  const submit = (value: string) =>
    fetch(url, { method: 'POST', body: new URLSearchParams({ nonce: request.nonce, value0: value }) })

  const [first, second] = await Promise.all([
    submit(`re_${'A'.repeat(30)}`),
    submit(`re_${'B'.repeat(30)}`),
  ])

  const statuses = [first?.status, second?.status].sort()
  expect(statuses).toEqual([200, 410])
  expect(store.get(request.id)?.status).toBe('written')

  // Whichever one won, the file holds its value and only its value.
  const contents = await read('.env')
  expect([`RESEND_API_KEY=re_${'A'.repeat(30)}\n`, `RESEND_API_KEY=re_${'B'.repeat(30)}\n`]).toContain(contents)
})

it('offers another attempt when the value cannot be stored in a dotenv file', async () => {
  const { submitValue, exists, store, request } = await setupTest({ names: ['GCP_SA'], ask: { format: 'json' } })
  const response = await submitValue('{\n  "note": "it\'s here"\n}')

  expect(response.status).toBe(422)
  expect(await response.text()).toContain('mixes quote characters')
  expect(await exists('.env')).toBe(false)
  expect(store.get(request.id)?.status).toBe('awaiting')
})

it('writes a JSON document to a dotenv sink', async () => {
  const { submitValue, read } = await setupTest({ names: ['GCP_SA'], ask: { format: 'json' } })
  const document = '{\n  "type": "service_account"\n}'

  const response = await submitValue(document)

  expect(response.status).toBe(200)
  expect(await read('.env')).toBe(`GCP_SA='${document}'\n`)
})

it('refuses a sink that is a directory rather than failing at write time', async () => {
  const workspace = await setupWorkspace()
  teardowns.push(workspace.cleanup)
  await mkdir(join(workspace.root, 'config'))

  const sink = await resolveSink({ root: workspace.root, spec: { kind: 'file', path: 'config' } })

  expect(sink).toEqual({ ok: false, message: 'the sink path is a directory' })
})

it('accepts a multiline value submitted as a file and normalises its line endings', async () => {
  const { request, url, read } = await setupTest({
    names: ['SIGNING_KEY'],
    ask: { format: 'pem' },
    sinkKind: 'file',
    sinkPath: 'secrets/id.pem',
  })
  const pem = '-----BEGIN PRIVATE KEY-----\r\nMIIBabc\r\n-----END PRIVATE KEY-----'
  const body = new FormData()
  body.set('nonce', request.nonce)
  body.set('value0', '')
  body.set('value0-file', new Blob([pem], { type: 'application/x-pem-file' }), 'id.pem')

  const response = await fetch(url, { method: 'POST', body })

  expect(response.status).toBe(200)
  expect(await read('secrets/id.pem')).toBe(
    '-----BEGIN PRIVATE KEY-----\nMIIBabc\n-----END PRIVATE KEY-----',
  )
})

it('prefers the typed value when no file was chosen', async () => {
  const { request, url, read } = await setupTest({ names: ['CONFIG'], ask: { format: 'json' }, sinkKind: 'file', sinkPath: 'c.json' })
  const body = new FormData()
  body.set('nonce', request.nonce)
  body.set('value0', '{"a":1}')

  const response = await fetch(url, { method: 'POST', body })

  expect(response.status).toBe(200)
  expect(await read('c.json')).toBe('{"a":1}')
})

it('offers the override and writes only after it is ticked for a tracked file', async () => {
  const { get, submitValue, read, store, request } = await setupTest({
    git: true,
    files: { '.env': 'PORT=3000\n' },
    tracked: ['.env'],
  })

  expect(await (await get()).text()).toContain('git already tracks this file')

  const refused = await submitValue(RESEND_KEY)
  expect(refused.status).toBe(422)
  expect(await read('.env')).toBe('PORT=3000\n')
  expect(store.get(request.id)?.status).toBe('awaiting')

  const allowed = await submitValue(RESEND_KEY, { allowTracked: 'yes' })
  expect(allowed.status).toBe(200)
  expect(await read('.env')).toBe(`PORT=3000\nRESEND_API_KEY=${RESEND_KEY}\n`)
})

it('refuses a submission once the request has expired', async () => {
  const { submitValue, exists } = await setupTest({ ttlMs: 1 })
  await new Promise(resolve => setTimeout(resolve, 5))

  const response = await submitValue(RESEND_KEY)

  expect(response.status).toBe(410)
  expect(await exists('.env')).toBe(false)
})

describe('the show values switch', () => {
  it('offers one switch for every field, and an eye on each that needs the page script', async () => {
    const { get } = await setupTest({ names: ['A_KEY', 'B_KEY', 'C_KEY'], ask: { format: 'text' }, ttlMs: 30 })
    const html = await (await get()).text()
    const eyes = html.match(/<button type="button" class="reveal"[^>]*>/g) ?? []

    expect(html.match(/type="checkbox" aria-label="Show values"/g)).toHaveLength(1)
    expect(eyes).toHaveLength(3)
    eyes.forEach(eye => {
      expect(eye).toContain('data-needs-script hidden')
      expect(eye).not.toContain('name=')
    })
  })

  it('masks every value by default and unmasks them all when the switch is on', async () => {
    const { get } = await setupTest({ ttlMs: 30 })
    const html = await (await get()).text()

    expect(html).toContain('textarea.secret { -webkit-text-security: disc; }')
    expect(html).toContain(
      'form:has(#reveal-all:checked) textarea.secret, textarea.secret.shown { -webkit-text-security: none; }',
    )
  })

  it('still hides the values where the masking property is missing', async () => {
    const { get } = await setupTest({ ttlMs: 30 })
    const html = await (await get()).text()

    expect(html).toContain('@supports not (-webkit-text-security: disc)')
    expect(html).toContain('textarea.secret { color: transparent; caret-color: var(--ink); }')
  })

  it('never submits the switch along with the values', async () => {
    const { get } = await setupTest({ ttlMs: 30 })
    const html = await (await get()).text()
    const toggle = /<input id="reveal-all"[^>]*>/.exec(html)?.[0] ?? ''

    expect(toggle).not.toBe('')
    expect(toggle).not.toContain('name=')
  })

  it('offers no switch when every value is multi-line and already visible', async () => {
    const { get } = await setupTest({ names: ['SIGNING_KEY'], ask: { format: 'pem' }, ttlMs: 30 })
    const html = await (await get()).text()

    expect(html).toContain('<textarea')
    expect(html).not.toContain('id="reveal-all"')
  })
})

/**
 * Safari's AutoFill takes an input for a password field when it is typed as a password or
 * masked with -webkit-text-security, and offers to save what was typed into it. It never
 * takes a textarea for one, so the page masks textareas and nothing else.
 */
describe('nothing for a password manager to save', () => {
  const threeKeys = { names: ['A_KEY', 'B_KEY', 'C_KEY'], ask: { format: 'text' as const } }

  it('puts every value in a textarea, never in a text or password input', async () => {
    const { get } = await setupTest({ ...threeKeys, ttlMs: 30 })
    const html = await (await get()).text()

    expect(html.match(/<textarea class="secret" rows="1" data-single-line id="value\d"/g)).toHaveLength(3)
    expect(html).not.toMatch(/<input(?![^>]*type="(?:hidden|checkbox|file)")[^>]*>/)
  })

  it('masks textareas and nothing else, since the property is inherited', async () => {
    const { get } = await setupTest({ ...threeKeys, ttlMs: 30 })
    const html = await (await get()).text()
    // Each rule's selector and body, in one pass: the page's inlined fonts are long runs without
    // a brace, which a regular expression over the whole page would scan again from every character.
    const masked = html
      .split('}')
      .map(chunk => chunk.split('{'))
      .filter(parts => parts.at(-1)?.includes('-webkit-text-security:') === true)
      .map(parts => parts.at(-2)?.trim().split('\n').pop() ?? '')

    expect(masked).toEqual(['textarea.secret', 'form:has(#reveal-all:checked) textarea.secret, textarea.secret.shown'])
  })
})

describe('the import card', () => {
  it('says a block can be pasted anywhere, and offers a file too', async () => {
    const { get } = await setupTest({ names: ['A_KEY', 'B_KEY'], ask: { format: 'text' }, ttlMs: 30 })
    const html = withoutIcons(await (await get()).text())

    expect(html).toContain('Paste them all at once')
    expect(html).toContain('offprompt matches each key to its field')
    expect(html).toContain('>Choose file</label>')
  })

  it('speaks of one key when there is only one', async () => {
    const { get } = await setupTest({ ttlMs: 30 })
    const html = await (await get()).text()
    expect(html).toContain('Paste it from a .env')
    expect(html).toContain('offprompt matches the key to its field')
  })

  it('arrives hidden, for the page script to reveal, so it is never a dead button', async () => {
    const { get } = await setupTest({ ttlMs: 30 })
    const html = await (await get()).text()
    expect(html).toContain('<section class="import" data-needs-script hidden>')
  })

  it('never submits the imported file itself, only the values it fills', async () => {
    const { get } = await setupTest({ ttlMs: 30 })
    const html = await (await get()).text()
    const picker = /<input id="import-file"[^>]*>/.exec(html)?.[0] ?? ''

    expect(picker).toContain('type="file"')
    expect(picker).not.toContain('name=')
  })
})

describe('the written page', () => {
  it('says the tab can be closed, in its title and on the page', async () => {
    const { submitValue } = await setupTest()
    const html = await (await submitValue(RESEND_KEY)).text()

    expect(html).toContain('<title>Written — you can close this tab</title>')
    expect(html).toContain('<h1 tabindex="-1">Written.</h1>')
    expect(html).toContain("<p>You can close this tab.</p><p>The page was single use and won't open again.</p>")
  })

  it('says where the value went, and never holds it', async () => {
    const { submitValue } = await setupTest()
    const html = await (await submitValue(RESEND_KEY)).text()

    expect(html).toContain('The value is in .env. The agent has the names and is carrying on.')
    expect(html).not.toContain(RESEND_KEY)
  })

  it('speaks in the plural for a batch', async () => {
    const { submit } = await setupTest({ names: ['A_KEY', 'B_KEY'], ask: { format: 'text' } })
    const html = await (await submit({ value0: 'ay', value1: 'bee' })).text()
    expect(html).toContain('Two values are in .env.')
  })

  it('lists each key and whether it was added or replaced', async () => {
    const { submit } = await setupTest({
      names: ['A_KEY', 'B_KEY'],
      ask: { format: 'text' },
      files: { '.env': 'B_KEY=old\n' },
    })
    const html = withoutIcons(await (await submit({ value0: 'ay', value1: 'bee' })).text())

    expect(html).toContain('<span class="key">A_KEY</span><span class="done added">added</span>')
    expect(html).toContain('<span class="key">B_KEY</span><span class="done replaced">replaced</span>')
    expect(html).toContain('2 written</span>')
  })
})

describe('collecting several secrets at once', () => {
  const twoKeys = { names: ['API_SECRET_A', 'API_SECRET_B'], ask: { format: 'text' as const } }

  it('shows a field for every key it asked for', async () => {
    const { get } = await setupTest({ ...twoKeys, ttlMs: 30 })
    const html = await (await get()).text()

    expect(html).toContain('name="value0" data-key="API_SECRET_A"')
    expect(html).toContain('name="value1" data-key="API_SECRET_B"')
  })

  it('writes every field in one pass', async () => {
    const { submit, read } = await setupTest(twoKeys)

    const response = await submit({ value0: 'some_secret_a', value1: 'some secret with b and spaces' })

    expect(response.status).toBe(200)
    expect(await read('.env')).toBe("API_SECRET_A=some_secret_a\nAPI_SECRET_B='some secret with b and spaces'\n")
  })

  it('names the keys still missing and writes nothing', async () => {
    const { submit, exists, store, request } = await setupTest(twoKeys)

    const response = await submit({ value0: 'only_this_one' })

    const html = await response.text()
    expect(response.status).toBe(422)
    expect(withoutIcons(html)).toMatch(/id="value1-rules">\s*<li class="fail" data-required><span>Required\. The agent asked for this one\.<\/span><\/li>/)
    expect(html).not.toMatch(/id="value0-rules">\s*<li class="fail" data-required>/)
    expect(await exists('.env')).toBe(false)
    expect(store.get(request.id)?.status).toBe('awaiting')
  })

  it('names which key failed validation when several are in play', async () => {
    const { submit, exists } = await setupTest({ names: ['GOOD_KEY', 'RESEND_API_KEY'], ask: { provider: 'resend' } })

    const response = await submit({ value0: `re_${'a'.repeat(30)}`, value1: 'sk_live_wrong_provider_key' })
    const html = await response.text()

    const second = /<ul class="rules" id="value1-rules">([\s\S]*?)<\/ul>/.exec(withoutIcons(html))?.[1] ?? ''
    const first = /<ul class="rules" id="value0-rules">([\s\S]*?)<\/ul>/.exec(html)?.[1] ?? ''
    expect(response.status).toBe(422)
    expect(second).toContain('<li data-rule="0" class="fail"><span>starts with re_</span></li>')
    expect(first).not.toContain('class="fail"')
    expect(await exists('.env')).toBe(false)
  })

  it('writes the whole batch or none of it', async () => {
    const { submit, exists } = await setupTest({ names: ['GOOD', 'BAD'], ask: { format: 'text' } })

    // A value opening with a double quote and carrying a single one fits no dotenv form.
    const response = await submit({ value0: 'fine', value1: `"it's` })

    expect(response.status).toBe(422)
    expect(await response.text()).toContain('mixes quote characters')
    expect(await exists('.env')).toBe(false)
  })

  it('never echoes a submitted value back into the form', async () => {
    const { submit } = await setupTest(twoKeys)
    const response = await submit({ value0: 'leak_me_please' })
    expect(await response.text()).not.toContain('leak_me_please')
  })

})

describe('a single-line value', () => {
  it('loses its line breaks, as it would in a text input', async () => {
    const { submitValue, read } = await setupTest()

    const response = await submitValue(`${RESEND_KEY}\r\n`)

    expect(response.status).toBe(200)
    expect(await read('.env')).toBe(`RESEND_API_KEY=${RESEND_KEY}\n`)
  })

  it('loses the line breaks inside it too', async () => {
    const { submitValue, read } = await setupTest({ names: ['TOKEN'], ask: { format: 'text' } })
    await submitValue('first\nsecond')
    expect(await read('.env')).toBe('TOKEN=firstsecond\n')
  })
})

describe('a field given its own NAME=value line', () => {
  const twoKeys = { names: ['API_SECRET_A', 'API_SECRET_B'], ask: { format: 'text' as const } }

  it('keeps the value and drops the name, as a paste with the script off would send it', async () => {
    const { submit, read } = await setupTest(twoKeys)

    const response = await submit({ value0: 'API_SECRET_A=ay', value1: 'API_SECRET_B="bee with spaces"' })

    expect(response.status).toBe(200)
    expect(await read('.env')).toBe("API_SECRET_A=ay\nAPI_SECRET_B='bee with spaces'\n")
  })

  it('leaves a value alone when the name in it belongs to another field', async () => {
    const { submit, read } = await setupTest(twoKeys)

    const response = await submit({ value0: 'API_SECRET_B=not_mine', value1: 'bee' })

    expect(response.status).toBe(200)
    expect(await read('.env')).toContain('API_SECRET_A=API_SECRET_B=not_mine')
  })

  it('leaves a value alone when it merely contains an equals sign', async () => {
    const { submit, read } = await setupTest({ names: ['TOKEN'], ask: { format: 'text' } })

    const response = await submit({ value0: 'dGhpcyBpcyBhIHNlY3JldA==' })

    expect(response.status).toBe(200)
    expect(await read('.env')).toBe('TOKEN=dGhpcyBpcyBhIHNlY3JldA==\n')
  })
})

describe('the page script', () => {
  it('ships inline under the same per-response nonce as the styles', async () => {
    const { get } = await setupTest({ ttlMs: 30 })
    const response = await get()
    const html = await response.text()
    const nonce = /script-src 'nonce-([0-9a-f]{32})'/.exec(response.headers.get('content-security-policy') ?? '')?.[1]

    expect(nonce).toBeDefined()
    expect(html).toContain(`<script nonce="${nonce ?? ''}">`)
    expect(html).toContain(`<style nonce="${nonce ?? ''}">`)
  })

  it('carries the dotenv reader the sinks use, so a paste is read the way the file will be', async () => {
    const { get } = await setupTest({ ttlMs: 30 })
    const html = await (await get()).text()
    expect(html).toContain('addEventListener("paste"')
  })

  it('lets the script reach only the server that served it', async () => {
    const { get } = await setupTest({ ttlMs: 30 })
    const policy = (await get()).headers.get('content-security-policy') ?? ''

    expect(policy).toContain("default-src 'none'")
    expect(policy).toContain("connect-src 'self';")
    expect(policy).not.toMatch(/connect-src[^;]*(?:\*|https?:|'unsafe)/)
    expect(policy).not.toMatch(/script-src[^;]*(?:'unsafe-inline'|'self'|https?:)/)
  })

  it('marks the write button so the script can take over submitting', async () => {
    const { get } = await setupTest({ ttlMs: 30 })
    const html = withoutIcons(await (await get()).text())
    expect(html).toContain(
      '<button type="submit" class="primary" data-submit><span data-label>Write to .env</span><kbd class="button-kbd" data-shortcut="↵">⌘ ↵</kbd></button>',
    )
  })

  it('is not sent with the written page, which has nothing to fill', async () => {
    const { submitValue } = await setupTest()
    const html = await (await submitValue(RESEND_KEY)).text()
    expect(html).not.toContain('<script')
  })
})

describe('the layout of a request', () => {
  const threeKeys = { names: ['STRIPE_SECRET_KEY', 'STRIPE_PUBLISHABLE_KEY', 'STRIPE_WEBHOOK_SECRET'], ask: { format: 'text' as const } }

  it('says which file it writes to, and the project it is in', async () => {
    const { get, request } = await setupTest({ ttlMs: 30 })
    const html = await (await get()).text()
    expect(html).toContain('<span class="target-label">Writes to</span>')
    expect(html).toContain(`<span class="file" title="${request.sink.absolutePath}">.env</span>`)
    expect(html).not.toContain('dotenv file')
  })

  it('names each key on its own field, and in the list of what a dropped file fills', async () => {
    const { get } = await setupTest({ ...threeKeys, ttlMs: 30 })
    const html = await (await get()).text()

    expect(html.match(/>STRIPE_SECRET_KEY</g)).toEqual(['>STRIPE_SECRET_KEY<', '>STRIPE_SECRET_KEY<'])
    expect(html).toContain('<label class="key" for="value0">STRIPE_SECRET_KEY</label>')
    expect(html).toContain('<li>STRIPE_SECRET_KEY</li><li>STRIPE_PUBLISHABLE_KEY</li><li>STRIPE_WEBHOOK_SECRET</li>')
  })

  it('names the keys on the written page, but none of the values', async () => {
    const { submit } = await setupTest({ ...threeKeys })
    const html = await (await submit({ value0: 'first_value', value1: 'second_value', value2: 'third_value' })).text()

    expect(html).toContain('<span class="key">STRIPE_SECRET_KEY</span>')
    expect(html).not.toMatch(/first_value|second_value|third_value/)
  })

  it('shows the caption the agent gave a secret under its label, escaped', async () => {
    const workspace = await setupWorkspace()
    teardowns.push(workspace.cleanup)
    const store = createRequestStore()
    const server = await startLoopbackServer({ store })
    teardowns.push(server.close)
    const sink = await resolveSink({ root: workspace.root, spec: { kind: 'dotenv', path: '.env' } })
    if (!sink.ok) throw new Error(sink.message)
    const request = store.create({
      secrets: [
        { name: 'A_KEY', value: PLAIN, overwrites: false, caption: 'Dashboard → API keys <b>Secret</b>' },
        { name: 'B_KEY', value: PLAIN, overwrites: false },
      ],
      reason: 'needed',
      sink: sink.value,
    })

    const html = await (await fetch(server.urlFor(request))).text()

    expect(html).toContain('<p class="caption">Dashboard → API keys &lt;b&gt;Secret&lt;/b&gt;</p>')
    expect(html.match(/class="caption"/g)).toHaveLength(1)
  })

  it('says under its field that a key the destination already holds will be replaced', async () => {
    const { get } = await setupTest({ names: ['A_KEY', 'B_KEY'], ask: { format: 'text' }, ttlMs: 30, files: { '.env': 'B_KEY=old\n' } })
    const html = await (await get()).text()
    const notice = html.indexOf('Already in .env. Writing will replace the current value.')

    expect(html.match(/Writing will replace the current value/g)).toHaveLength(1)
    expect(notice).toBeGreaterThan(html.indexOf('id="value1"'))
  })
})

describe('errors under the field they belong to', () => {
  const twoKeys = { names: ['GOOD_KEY', 'BAD_KEY'], ask: { provider: 'resend' as const } }

  it('draws one line per rule under each field', async () => {
    const { get } = await setupTest({ ttlMs: 30 })
    const html = await (await get()).text()
    const lines = /<ul class="rules" id="value0-rules">([\s\S]*?)<\/ul>/.exec(withoutIcons(html))?.[1] ?? ''

    expect(lines).toContain('<li data-rule="0"><span>starts with re_</span></li>')
    expect(lines).toContain('<li data-rule="1"><span>20 to 80 characters</span></li>')
  })

  it('marks every rule a submitted value broke, and only those', async () => {
    const { submitValue } = await setupTest()
    const html = await (await submitValue('sk_live_x')).text()
    const lines = /<ul class="rules" id="value0-rules">([\s\S]*?)<\/ul>/.exec(withoutIcons(html))?.[1] ?? ''

    expect(lines).toContain('<li data-rule="0" class="fail"><span>starts with re_</span></li>')
    expect(lines).toContain('<li data-rule="1" class="fail"><span>20 to 80 characters</span></li>')
  })

  it('shows a quiet rule only once it fails', async () => {
    const quietFirst = await setupTest({ names: ['A_KEY'], ask: { format: 'text' }, ttlMs: 30 })
    const untouched = withoutIcons(await (await quietFirst.get()).text())
    expect(untouched).toMatch(/data-quiet hidden><span>cannot be stored in a \.env file/)

    const { submitValue } = await setupTest({ names: ['A_KEY'], ask: { format: 'text' } })
    const failed = withoutIcons(await (await submitValue(`"it's`)).text())
    expect(failed).toMatch(/class="fail" data-quiet><span>cannot be stored in a \.env file/)
  })

  it('keeps the form-level box for problems that are not about one field', async () => {
    const { submitValue } = await setupTest({ git: true, files: { '.env': 'PORT=3000\n' }, tracked: ['.env'] })
    const html = await (await submitValue(RESEND_KEY)).text()
    expect(html).toContain('<div class="banner bad error" role="alert" tabindex="-1">')
    expect(html).toContain('<p>that file is tracked by git, so the values would be committed</p>')
  })

  it('never puts a submitted value back on the page', async () => {
    const { submit } = await setupTest(twoKeys)
    const html = await (await submit({ value0: `re_${'a'.repeat(30)}`, value1: 'leak_me_please' })).text()
    expect(html).not.toContain('leak_me_please')
  })

  it('hands the page script every rule the server checks the field against', async () => {
    const { get } = await setupTest({ ...twoKeys, ttlMs: 30 })
    const html = await (await get()).text()
    const rules = /data-key="GOOD_KEY"\s+data-rules="([^"]*)"/.exec(html)?.[1] ?? ''
    const messages = (JSON.parse(rules.replaceAll('&quot;', '"')) as { message: string }[]).map(rule => rule.message)

    expect(messages).toEqual([
      'starts with re_',
      '20 to 80 characters',
      'no more than 8192 characters',
      'cannot be stored in a .env file: it mixes single and double quotes, or a single quote and a backslash',
    ])
  })
})

describe('the agent reason', () => {
  it('renders the Markdown the agent wrote', async () => {
    const { get } = await setupTest({
      reason: 'Checkout needs **both** keys:\n\n- the `secret` one signs requests\n- the publishable one runs in the browser',
      ttlMs: 30,
    })
    const html = await (await get()).text()

    expect(html).toContain('<div class="claim"><p>Checkout needs <strong>both</strong> keys:</p>')
    expect(html).toContain('<li>the <code>secret</code> one signs requests</li>')
  })

  it('shows a link the agent wrote without making it clickable', async () => {
    const { get } = await setupTest({ reason: 'Copy it from [here](https://evil.example/login).', ttlMs: 30 })
    const html = await (await get()).text()
    const claim = /<div class="claim">([\s\S]*?)<\/div>/.exec(html)?.[1] ?? ''

    expect(claim).toContain('here (https://evil.example/login)')
    expect(claim).not.toContain('<a')
  })
})

describe('the status endpoint', () => {
  it('says an open request is awaiting and how long it has left', async () => {
    const { get, url } = await setupTest()
    const response = await get(`${url}/status`)

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toContain('application/json')
    expect(response.headers.get('cache-control')).toContain('no-store')
    expect(await response.json()).toEqual({ status: 'awaiting', expiresIn: 300 })
  })

  it('still answers once the request is written or expired, so the page can say so', async () => {
    const { get, url, submitValue } = await setupTest()
    await submitValue(RESEND_KEY)
    expect(await (await get(`${url}/status`)).json()).toEqual({ status: 'written', expiresIn: 300 })

    const other = await setupTest()
    other.store.expire(other.request.id)
    expect(await (await other.get(`${other.url}/status`)).json()).toMatchObject({ status: 'expired' })
  })

  it('is a 404 for an unknown token and refuses anything but GET', async () => {
    const { get, server, url } = await setupTest()
    expect((await get(`${server.origin}/r/${'0'.repeat(32)}/status`)).status).toBe(404)
    expect((await get(`${url}/status`, { method: 'POST' })).status).toBe(404)
  })

  it('pins the Host header like every other path', async () => {
    const { url } = await setupTest()
    const target = new URL(url)
    const rebound = await rawRequest({ port: target.port, path: `${target.pathname}/status`, headers: { host: 'evil.example' } })
    expect(rebound.status).toBe(421)
  })
})

describe("a submission that is not the page's form", () => {
  it('is refused as an out-of-date page, and writes nothing, whatever it carries', async () => {
    const { url, request, store, exists } = await setupTest()

    const asJson = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ nonce: request.nonce, value0: RESEND_KEY }),
    })
    const noBoundary = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'multipart/form-data' },
      body: `--x\r\nContent-Disposition: form-data; name="nonce"\r\n\r\n${request.nonce}\r\n--x--\r\n`,
    })
    const withoutNonce = new FormData()
    withoutNonce.append('value0', RESEND_KEY)
    const noNonce = await fetch(url, { method: 'POST', body: withoutNonce })

    expect([asJson.status, noBoundary.status, noNonce.status]).toEqual([403, 403, 403])
    expect(store.get(request.id)?.status).toBe('awaiting')
    expect(await exists('.env')).toBe(false)
  })
})

// Windows ignores a folder's mode, so a folder that takes no new files cannot be made this way there.
describe.skipIf(process.platform === 'win32')('a write the file system refuses', () => {
  /** A project folder no one can write into, until the test hands it back. */
  const lockedTest = async () => {
    const test = await setupTest()
    await chmod(test.root, 0o500)
    teardowns.unshift(() => chmod(test.root, 0o700))
    return test
  }

  it('says the file cannot be written before anyone types', async () => {
    const { get } = await lockedTest()
    expect(await (await get()).text()).toContain('<span class="state bad">not writable</span>')
  })

  it('writes nothing, tells the agent nothing, and keeps the request open for another go', async () => {
    const { submitValue, store, request, written, root, read } = await lockedTest()

    const response = await submitValue(RESEND_KEY)
    const html = await response.text()

    expect(response.status).toBe(500)
    expect(html).toContain('data-write-failed')
    expect(html).toContain("Couldn't write to .env")
    expect(html).toContain('EACCES')
    expect(html).not.toContain('.offprompt-')
    expect(html).not.toContain(RESEND_KEY)
    expect(store.get(request.id)?.status).toBe('awaiting')
    expect(written).toEqual([])

    await chmod(root, 0o700)
    const retried = await submitValue(RESEND_KEY)
    expect(retried.status).toBe(200)
    expect(await read('.env')).toBe(`RESEND_API_KEY=${RESEND_KEY}\n`)
    expect(written.map(record => record.id)).toEqual([request.id])
  })
})

describe('the fingerprint', () => {
  /** What the page makes for one submission: 32 random bytes, base64url. */
  const KEY = 'k'.repeat(43)

  it('is taken from what the file holds, with the key the page sent', async () => {
    const { submit, store, request } = await setupTest({ names: ['A_KEY', 'B_KEY'], ask: { format: 'text' } })

    await submit({ value0: 'ay', value1: 'bee with spaces', fingerprint: KEY })

    expect(store.get(request.id)).toMatchObject({
      emoji: await fingerprintOf({ key: KEY, values: [['A_KEY', 'ay'], ['B_KEY', 'bee with spaces']] }),
      fingerprinted: ['A_KEY', 'B_KEY'],
    })
  })

  it('takes the value as it is written, not as it was sent', async () => {
    const { submit, store, request } = await setupTest({ names: ['A_KEY'], ask: { format: 'text' } })

    await submit({ value0: 'A_KEY=ay\r\n', fingerprint: KEY })

    expect(store.get(request.id)?.emoji).toBe(await fingerprintOf({ key: KEY, values: [['A_KEY', 'ay']] }))
  })

  it('is never keyed with anything a page served, and still taken without the page script', async () => {
    const { submit, store, request, get } = await setupTest({ names: ['A_KEY'], ask: { format: 'text' } })
    const page = await (await get()).text()

    await submit({ value0: 'ay' })

    const emoji = store.get(request.id)?.emoji
    expect(emoji).toMatch(/^\S+ \S+ \S+ \S+$/u)
    expect(emoji).not.toBe(await fingerprintOf({ key: request.nonce, values: [['A_KEY', 'ay']] }))
    expect(page).not.toContain('name="fingerprint"')
  })
})

describe('what each page offers', () => {
  it('takes no .env paste or drop for a request written to a file of its own', async () => {
    const { get } = await setupTest({ names: ['SIGNING_KEY'], ask: { format: 'pem' }, sinkPath: 'key.pem', sinkKind: 'file', ttlMs: 30 })
    const html = await (await get()).text()

    expect(html).not.toContain('<section class="import"')
    expect(html).not.toContain('class="drop-overlay"')
    expect(html).toContain('id="fill-status"')
  })

  it('offers the switch when the only masked value is one the page generates', async () => {
    const { get } = await setupTest({ names: ['SESSION_SECRET'], ask: { generate: { bytes: 32, encoding: 'hex' } }, ttlMs: 30 })
    expect(await (await get()).text()).toContain('id="reveal-all"')
  })

  it('marks each page with what it is, so the page script knows an answer from offprompt', async () => {
    const { get, submitValue } = await setupTest()
    expect(await (await get()).text()).toContain('<main data-page="form">')
    expect(await (await submitValue(RESEND_KEY)).text()).toContain('<main data-page="written" class="centered">')
    expect(await (await get()).text()).toContain('<main data-page="closed" class="centered">')
  })

  it('says what to do next on a closed page once, and not after a headline that already does', async () => {
    const { post } = await setupTest()
    const html = await (await post(new URLSearchParams({ nonce: '0'.repeat(32), value0: RESEND_KEY }))).text()

    expect(html).toContain('<h1 class="headline">This page is out of date.</h1><p>Ask the agent to request the value again.</p>')
    expect(html.match(/Ask the agent to request the value again/g)).toHaveLength(1)
  })
})
