import { randomBytes, timingSafeEqual } from 'node:crypto'
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http'
import { buffer } from 'node:stream/consumers'

import { asWritten } from '../core/as-written.js'
import { generatedRules } from '../core/generated.js'
import { fingerprintOf } from '../core/fingerprint.js'
import { isRecord } from '../core/guards.js'
import { fieldFailures, fieldRules } from '../core/rules.js'
import { open } from '../core/sealing.js'
import { fail } from '../core/result.js'
import { refusalFor, sinkValues, sinkWritable, writeToSink } from '../core/sinks.js'
import type { RequestedSecret, RequestStore, SecretRequest } from '../core/store.js'
import type { Rule } from '../registry/schema.js'
import { valuesToWrite } from '../core/values.js'
import { boundaryOf, fieldValue, parseMultipart, type MultipartField } from './multipart.js'
import { ASK_AGAIN, renderClosed } from './page/closed.js'
import { REQUIRED, type FieldProblems } from './page/field.js'
import { renderForm } from './page/form.js'
import { renderWritten } from './page/written.js'

const LOOPBACK = '127.0.0.1'

const MAX_BODY_BYTES = 64 * 1024

const REQUEST_PATH = /^\/r\/([0-9a-f]{8,128})$/

/** The page polls this to learn whether its request is still open and for how long. */
const STATUS_PATH = /^\/r\/([0-9a-f]{8,128})\/status$/

const STATUS_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store, max-age=0',
  'referrer-policy': 'no-referrer',
  'x-content-type-options': 'nosniff',
}

/** Byte lengths are compared first: `timingSafeEqual` throws on a length mismatch. */
const sameString = (a: string, b: string) => {
  const left = Buffer.from(a, 'utf8')
  const right = Buffer.from(b, 'utf8')
  return left.length === right.length && timingSafeEqual(left, right)
}

const newNonce = () => randomBytes(16).toString('hex')

const headers = (cspNonce: string) => ({
  'content-type': 'text/html; charset=utf-8',
  'content-security-policy': [
    "default-src 'none'",
    `script-src 'nonce-${cspNonce}'`,
    // The page posts its own values, so it may reach the server that served it and nothing else.
    "connect-src 'self'",
    `style-src 'nonce-${cspNonce}'`,
    // The page's two typefaces travel inside its stylesheet.
    'font-src data:',
    "form-action 'self'",
    "base-uri 'none'",
    "frame-ancestors 'none'",
  ].join('; '),
  'cache-control': 'no-store, max-age=0',
  'referrer-policy': 'no-referrer',
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
})

const send = ({
  response,
  status,
  cspNonce,
  html,
}: {
  response: ServerResponse
  status: number
  cspNonce: string
  html: string
}) => {
  response.writeHead(status, headers(cspNonce))
  response.end(html)
}

const sendClosed = ({
  response,
  status,
  headline,
  next = ASK_AGAIN,
}: {
  response: ServerResponse
  status: number
  headline: string
  /** What the human can do now; most closed pages leave them to ask again. */
  next?: string
}) => {
  const cspNonce = newNonce()
  send({ response, status, cspNonce, html: renderClosed({ cspNonce, headline, next }) })
}

/**
 * The form, as it stands: with the rules a submission broke, a problem that is not about one
 * field, or the reason a write failed. Whether the file can be written is checked afresh
 * each time, so the page can say so before the human types.
 */
const sendForm = async ({
  response,
  request,
  host,
  error,
  problems,
  failure,
}: {
  response: ServerResponse
  request: SecretRequest
  host: string | undefined
  error?: string
  problems?: FieldProblems
  /** Why the file system refused the write. Nothing was written, and the request stays open. */
  failure?: string
}) => {
  const cspNonce = newNonce()
  const html = renderForm({
    request,
    cspNonce,
    host,
    writable: await sinkWritable(request.sink),
    ...(error === undefined ? {} : { error }),
    ...(problems === undefined ? {} : { problems }),
    ...(failure === undefined ? {} : { failure }),
  })
  const rejected = error !== undefined || (problems !== undefined && problems.size > 0)
  send({ response, status: failure !== undefined ? 500 : rejected ? 422 : 200, cspNonce, html })
}

/**
 * The fingerprint of what the file now holds for the keys the page sent, taken with the
 * same key and in the same order as the page takes it from what was typed.
 */
const fingerprintOfFile = async ({
  request,
  key,
  names,
}: {
  request: SecretRequest
  key: string
  names: readonly string[]
}) => {
  const held = await sinkValues({ sink: request.sink, names })
  return fingerprintOf({ key, values: names.map(name => [name, held.get(name) ?? ''] as const) })
}

/** Normalises the CRLF line endings a browser form submits, so a PEM stays intact. */
const normalise = (value: string) => value.replace(/\r\n/g, '\n')

type Submission = {
  readonly nonce: string
  readonly allowTracked: boolean
  readonly typed: ReadonlyMap<string, string>
  /** What a remote page posts in place of the values. */
  readonly sealed?: string
  /** The key the page took its fingerprint with, made for this one submission. */
  readonly fingerprintKey?: string
}

/** 32 random bytes, base64url, as the page makes a fingerprint key. */
const FINGERPRINT_KEY = /^[A-Za-z0-9_-]{43}$/

/**
 * The key a write's fingerprint is taken with: the one the page made for this submission,
 * or, from a page without its script, one made here. It is used once and kept nowhere, and
 * no page the server serves ever carries it.
 */
const fingerprintKeyOf = (submission: Submission) =>
  submission.fingerprintKey !== undefined && FINGERPRINT_KEY.test(submission.fingerprintKey)
    ? submission.fingerprintKey
    : randomBytes(32).toString('base64url')

const fieldsOf = (form: URLSearchParams) =>
  new Map([...form.entries()].map(([name, value]) => [name, normalise(value)]))

const multipartFieldsOf = (fields: readonly MultipartField[]) =>
  new Map(
    fields
      .filter(field => field.value !== '')
      .map(field => [field.name.replace(/-file$/, ''), normalise(field.value)]),
  )

const parseBody = ({ body, contentType }: { body: Buffer; contentType: string }): Submission | undefined => {
  if (contentType.startsWith('application/x-www-form-urlencoded')) {
    const form = new URLSearchParams(body.toString('utf8'))
    const nonce = form.get('nonce')
    if (nonce === null) return undefined
    const sealed = form.get('sealed')
    const fingerprintKey = form.get('fingerprint')
    return {
      nonce,
      allowTracked: form.get('allowTracked') === 'yes',
      typed: fieldsOf(form),
      ...(sealed === null ? {} : { sealed }),
      ...(fingerprintKey === null ? {} : { fingerprintKey }),
    }
  }
  if (!contentType.startsWith('multipart/form-data')) return undefined
  const boundary = boundaryOf(contentType)
  if (boundary === undefined) return undefined
  const parts = parseMultipart({ body, boundary })
  const nonce = fieldValue(parts, 'nonce')
  if (nonce === undefined) return undefined
  return {
    nonce,
    allowTracked: fieldValue(parts, 'allowTracked') === 'yes',
    typed: multipartFieldsOf(parts),
  }
}

const VALUE_FIELD = /^value\d+(-file)?$/

/** Whether the body carries anything in the clear that a sealed one keeps inside the seal. */
const carriesPlainFields = (submission: Submission) =>
  submission.allowTracked ||
  submission.fingerprintKey !== undefined ||
  [...submission.typed.keys()].some(name => VALUE_FIELD.test(name))

/** The plaintext a page seals: the fields a plain POST carries, minus the nonce. */
const submissionFrom = ({ plaintext, nonce }: { plaintext: string; nonce: string }): Submission => {
  const parsed: unknown = JSON.parse(plaintext)
  if (!isRecord(parsed) || !isRecord(parsed.values) || typeof parsed.allowTracked !== 'boolean') {
    throw new Error('not a sealed submission')
  }
  const typed = Object.entries(parsed.values).flatMap(([name, value]): [string, string][] =>
    typeof value === 'string' ? [[name, normalise(value)]] : [],
  )
  const { fingerprint } = parsed
  return {
    nonce,
    allowTracked: parsed.allowTracked,
    typed: new Map(typed),
    ...(typeof fingerprint === 'string' ? { fingerprintKey: fingerprint } : {}),
  }
}

/**
 * The submission a sealed body holds, or nothing when it does not open: tampered with,
 * sealed for another request, or the key is gone; or when what it opens to is
 * not a submission, which is answered the same way.
 */
const unsealed = async ({ request, submission }: { request: SecretRequest; submission: Submission }) => {
  const { sealed } = submission
  const { sealKey } = request
  if (sealed === undefined || sealKey === undefined) return undefined
  return open({ sealed, sealKey, token: request.token, nonce: request.nonce })
    .then(plaintext => submissionFrom({ plaintext, nonce: submission.nonce }))
    .catch(() => undefined)
}

/** What the page sent for one key, by the key's place in the request, and what it is checked against. */
type Collected = {
  readonly index: number
  readonly secret: RequestedSecret
  readonly rules: readonly Rule[]
  /** A generated key may arrive empty: offprompt then makes it here. */
  readonly optional: boolean
  readonly value: string
}

/**
 * What each key was given on the page: a typed value, or a generated one the page made or
 * the human pasted. A generated key the file already holds has no field to read.
 */
const collect = ({ request, submission }: { request: SecretRequest; submission: Submission }): Collected[] =>
  request.secrets.flatMap((secret, index): Collected[] => {
    const sent = submission.typed.get(`value${String(index)}`) ?? ''
    if (secret.value.kind === 'generated') {
      if (secret.overwrites) return []
      const value = asWritten({ name: secret.name, value: sent, multiline: false })
      return [{ index, secret, rules: generatedRules(secret.value), optional: true, value }]
    }
    const { rules, multiline } = secret.value
    return [{ index, secret, rules, optional: false, value: asWritten({ name: secret.name, value: sent, multiline }) }]
  })

const problemsWith = ({
  request,
  collected,
}: {
  request: SecretRequest
  collected: readonly Collected[]
}): FieldProblems =>
  new Map(
    collected.flatMap((entry): [number, readonly string[]][] => {
      if (entry.value === '') return entry.optional ? [] : [[entry.index, [REQUIRED]]]
      const broken = fieldFailures(fieldRules({ rules: entry.rules, sinkKind: request.sink.kind }), entry.value)
      return broken.length === 0 ? [] : [[entry.index, broken]]
    }),
  )

const OUT_OF_DATE = 'This page is out of date.'

const readBody = async (incoming: IncomingMessage): Promise<Buffer | undefined> => {
  const declared = Number(incoming.headers['content-length'])
  if (!Number.isInteger(declared) || declared < 0 || declared > MAX_BODY_BYTES) return undefined
  const body = await buffer(incoming)
  return body.length === declared ? body : undefined
}

const handlePost = async ({
  incoming,
  response,
  request,
  store,
  onWritten,
}: {
  incoming: IncomingMessage
  response: ServerResponse
  request: SecretRequest
  store: RequestStore
  onWritten: (written: SecretRequest) => void
}) => {
  const host = incoming.headers.host
  const body = await readBody(incoming)
  if (body === undefined) {
    await sendForm({ response, request, host, error: 'that submission was too large to read' })
    return
  }

  const posted = parseBody({ body, contentType: incoming.headers['content-type'] ?? '' })
  if (posted === undefined || !sameString(posted.nonce, request.nonce)) {
    sendClosed({ response, status: 403, headline: OUT_OF_DATE })
    return
  }

  // Without the page script, values would have crossed the tunnel in the clear.
  if (request.remote && (posted.sealed === undefined || carriesPlainFields(posted))) {
    sendClosed({
      response,
      status: 400,
      headline: 'This page needs JavaScript to send values safely.',
      next: 'Reload it with JavaScript on.',
    })
    return
  }

  const submission = request.remote ? await unsealed({ request, submission: posted }) : posted
  if (submission === undefined) {
    sendClosed({ response, status: 403, headline: OUT_OF_DATE })
    return
  }

  const collected = collect({ request, submission })
  const problems = problemsWith({ request, collected })
  // A value that does not validate leaves the request open for as long as it lives: the
  // human is trusted, so there is nothing to ration.
  if (problems.size > 0) {
    await sendForm({ response, request, host, problems })
    return
  }

  const values = valuesToWrite({
    secrets: request.secrets,
    typed: new Map(collected.map(entry => [entry.index, entry.value])),
  })
  const refusal = refusalFor({ sink: request.sink, values, allowTracked: submission.allowTracked })
  if (refusal !== undefined) {
    await sendForm({ response, request, host, error: refusal })
    return
  }

  // Claiming the record before the write is what makes "one write closes it" hold when
  // the human submits the same page twice: the second submission never reaches the sink.
  // The agent hears nothing until the write lands, and a failed write gives the claim back.
  if (store.claim(request.id) === undefined) {
    sendClosed({ response, status: 410, headline: 'This request has already been answered.' })
    return
  }

  const written = await writeToSink({ sink: request.sink, values, allowTracked: submission.allowTracked }).catch(
    (error: unknown) => fail(error instanceof Error ? error.message : String(error)),
  )
  if (!written.ok) {
    store.release(request.id)
    await sendForm({ response, request, host, failure: written.message })
    return
  }

  // A key offprompt made here, because its field came back empty, was never on the page.
  // A fingerprint that cannot be taken must not keep the write from closing the request.
  const fromPage = collected.filter(entry => entry.value !== '').map(entry => entry.secret.name)
  const emoji = await fingerprintOfFile({ request, key: fingerprintKeyOf(submission), names: fromPage }).catch(
    () => undefined,
  )
  const closed = store.markWritten(request.id, emoji === undefined ? undefined : { emoji, names: fromPage })
  if (closed === undefined) {
    sendClosed({
      response,
      status: 410,
      headline: 'This request closed while it was being written.',
      next: 'The values are in the file, but the agent was told the request closed. Tell it they are there.',
    })
    return
  }

  // A host that cannot take the completion notification must not turn a write into a failure.
  try {
    onWritten(closed)
  } catch {
    // The value is already in the sink; the dialog simply stays open.
  }
  const cspNonce = newNonce()
  send({ response, status: 200, cspNonce, html: renderWritten({ request: closed, cspNonce, host }) })
}

const listen = (server: Server) =>
  new Promise<number>((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, LOOPBACK, () => {
      const address = server.address()
      if (address === null || typeof address === 'string') {
        reject(new Error('the loopback server did not bind to a port'))
        return
      }
      resolve(address.port)
    })
  })

const ANOTHER_SITE = new Set(['cross-site', 'same-site'])

/**
 * The loopback under either of its names, on any port: port forwarding may carry the page
 * to the human under another number. A rebinding page's requests name its own domain.
 */
const LOOPBACK_HOST = /^(?:127\.0\.0\.1|localhost)(?::\d{1,5})?$/

/** The addresses this server answers to: the loopback, and the tunnel once one is up. */
export const isOwnHost = ({ host, tunnelHost }: { host: string | undefined; tunnelHost?: string | undefined }) =>
  host !== undefined && (LOOPBACK_HOST.test(host) || (tunnelHost !== undefined && host === tunnelHost))

/**
 * Whether the request came from a page that is not this one. `Sec-Fetch-Site` is the
 * reliable signal: a same-site-but-different-port page — another local dev server — still
 * reads as `same-site` and is refused. The `Origin` header is only a fallback, because
 * this page's `Referrer-Policy: no-referrer` makes a browser send `Origin: null` on its
 * own form submission.
 */
export const fromAnotherPage = ({
  headers,
  tunnelHost,
}: {
  headers: {
    readonly 'sec-fetch-site'?: string | string[] | undefined
    readonly origin?: string | string[] | undefined
  }
  tunnelHost?: string | undefined
}) => {
  const site = headers['sec-fetch-site']
  if (typeof site === 'string') return ANOTHER_SITE.has(site)
  const stated = headers.origin
  if (typeof stated !== 'string' || stated === 'null') return false
  const ownAddress = stated.startsWith('http://') && LOOPBACK_HOST.test(stated.slice('http://'.length))
  return !ownAddress && (tunnelHost === undefined || stated !== `https://${tunnelHost}`)
}

/**
 * What the page asks every few seconds: the request's state and the seconds it has left.
 * A closed request still answers, so the page can say it was answered or expired, and an
 * unknown token is a 404 like everywhere else.
 */
const sendStatus = ({
  incoming,
  response,
  store,
}: {
  incoming: IncomingMessage
  response: ServerResponse
  store: RequestStore
}) => {
  const token = STATUS_PATH.exec(incoming.url ?? '')?.[1]
  const request = token === undefined ? undefined : store.byToken(token)
  if (request === undefined || incoming.method !== 'GET') {
    sendClosed({ response, status: 404, headline: 'Nothing here.' })
    return
  }
  response.writeHead(200, STATUS_HEADERS)
  response.end(JSON.stringify({ status: request.status, expiresIn: store.expiresInSeconds(request) }))
}

/** Pins the request to this server's own addresses before anything else is read. */
const vetted = ({
  incoming,
  response,
  store,
  tunnelHost,
}: {
  incoming: IncomingMessage
  response: ServerResponse
  store: RequestStore
  tunnelHost: string | undefined
}) => {
  if (!isOwnHost({ host: incoming.headers.host, tunnelHost })) {
    sendClosed({ response, status: 421, headline: 'Wrong host.' })
    return undefined
  }
  if (fromAnotherPage({ headers: incoming.headers, tunnelHost })) {
    sendClosed({ response, status: 403, headline: 'Wrong origin.' })
    return undefined
  }
  const token = REQUEST_PATH.exec(incoming.url ?? '')?.[1]
  const request = token === undefined ? undefined : store.byToken(token)
  if (request === undefined) {
    sendClosed({ response, status: 404, headline: 'Nothing here.' })
    return undefined
  }
  if (request.status !== 'awaiting') {
    // A sealed value that arrives after its request closed can no longer be opened.
    if (request.remote && incoming.method === 'POST') sendClosed({ response, status: 403, headline: OUT_OF_DATE })
    else sendClosed({ response, status: 410, headline: 'This request is closed.' })
    return undefined
  }
  return request
}

const requestHandler =
  ({
    store,
    tunnelHost,
    onWritten,
  }: {
    store: RequestStore
    tunnelHost: () => string | undefined
    onWritten: (written: SecretRequest) => void
  }) =>
  (incoming: IncomingMessage, response: ServerResponse) => {
    void (async () => {
      if (STATUS_PATH.test(incoming.url ?? '')) {
        if (!isOwnHost({ host: incoming.headers.host, tunnelHost: tunnelHost() })) {
          sendClosed({ response, status: 421, headline: 'Wrong host.' })
          return
        }
        sendStatus({ incoming, response, store })
        return
      }
      const request = vetted({ incoming, response, store, tunnelHost: tunnelHost() })
      if (request === undefined) return
      if (incoming.method === 'GET') {
        await sendForm({ response, request, host: incoming.headers.host })
        return
      }
      if (incoming.method === 'POST') {
        await handlePost({ incoming, response, request, store, onWritten })
        return
      }
      sendClosed({ response, status: 405, headline: 'Nothing here.' })
    })().catch(() => {
      sendClosed({ response, status: 500, headline: 'offprompt could not complete that.' })
    })
  }

/**
 * The loopback server. It binds `127.0.0.1` on a random port, answers only on a path
 * carrying a request token, pins the `Host` header to the loopback and to the tunnel it is
 * told about, and sends no CORS headers at all, so a page in another tab cannot reach it.
 */
export const startLoopbackServer = async ({
  store,
  onWritten = () => undefined,
}: {
  store: RequestStore
  onWritten?: (written: SecretRequest) => void
}) => {
  const server = createServer()
  const port = await listen(server)
  const origin = `${LOOPBACK}:${port}`
  const tunnel: { host: string | undefined } = { host: undefined }
  server.on('request', requestHandler({ store, tunnelHost: () => tunnel.host, onWritten }))

  return {
    origin: `http://${origin}`,
    port,
    urlFor: (request: SecretRequest) => `http://${origin}/r/${request.token}`,
    /** The one hostname besides the loopback this server answers to, while a tunnel is up. */
    answerTo: (host: string | undefined) => {
      tunnel.host = host
    },
    close: () =>
      new Promise<void>(resolve => {
        server.closeAllConnections()
        server.close(() => resolve())
      }),
  }
}

export type LoopbackServer = Awaited<ReturnType<typeof startLoopbackServer>>
