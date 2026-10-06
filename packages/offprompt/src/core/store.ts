import { randomBytes, timingSafeEqual } from 'node:crypto'

import type { Asker } from '../registry/clients.js'
import type { Encoding } from './generated.js'
import type { Source } from '../registry/registry.js'
import type { Provider, Rule } from '../registry/schema.js'
import type { ResolvedSink } from './sinks.js'

export type RequestStatus = 'awaiting' | 'written' | 'expired'



/** A value the human types: what it is checked against, and what the page shows beside it. */
export type TypedValue = {
  readonly kind: 'typed'
  readonly rules: readonly Rule[]
  /** A taller field with a file picker, for a PEM block or a JSON document. */
  readonly multiline: boolean
  /** Drawn as dots until the human shows the values. */
  readonly masked: boolean
  readonly placeholder?: string
  /** What the value is, when its name does not say, such as "Postgres connection string". */
  readonly label?: string
  /** The registry format the value is of, when it is not a provider's key. */
  readonly format?: string
  /** The provider's key this value is, drawn with its logo and a link to where it is made. */
  readonly source?: Source
  /** Where someone who has no value of this kind yet can create one. */
  readonly offers: readonly { readonly provider: Provider; readonly url: string }[]
}

/** A value offprompt makes from random bytes at write time, which no one ever sees. */
export type GeneratedValue = { readonly kind: 'generated'; readonly bytes: number; readonly encoding: Encoding }

/** One key the agent asked for, and how its value comes to be. */
export type RequestedSecret = {
  readonly name: string
  readonly value: TypedValue | GeneratedValue
  /** The sink already holds this key. A generated key it holds is kept as it is. */
  readonly overwrites: boolean
  /** A short line from the agent shown under the field, such as where to find the value. */
  readonly caption?: string
}

/** Everything the form renders and the POST handler writes through. */
export type SecretRequest = {
  readonly id: string
  readonly secrets: readonly RequestedSecret[]
  readonly reason: string
  readonly sink: ResolvedSink
  readonly token: string
  readonly nonce: string
  readonly expiresAt: number
  readonly status: RequestStatus
  /** Asked for from a sandbox: the page seals its values, and the request lives longer. */
  readonly remote: boolean
  /** The private half of the request's key pair. Held only while the request is open. */
  readonly sealKey?: CryptoKey
  /** The fingerprint of the values the write took from the page, as the file holds them. */
  readonly emoji?: string
  /** The keys the fingerprint covers: every value that came from the page. */
  readonly fingerprinted?: readonly string[]
  /** The program the agent runs in, as it introduced itself to the MCP server. */
  readonly asker?: Asker
  /** The link the agent passes on to the human, where no page opened by itself. */
  readonly link?: string
}

export const DEFAULT_TTL_MS = 300_000

/** In a cloud agent the human may not be watching when the link appears. */
export const REMOTE_TTL_MS = 30 * 60_000

const EXPIRY_SLACK_MS = 25

/** How long a write under way may hold its record open past its expiry, should it hang. */
export const CLAIM_GRACE_MS = 60_000

/** How long a request is still found, written or expired, after its time is up. */
export const KEPT_AFTER_EXPIRY_MS = 60 * 60_000

const hex = (bytes: number) => randomBytes(bytes).toString('hex')

/** Byte lengths are compared first: `timingSafeEqual` throws on a length mismatch. */
const sameToken = (a: string, b: string) => {
  const left = Buffer.from(a, 'utf8')
  const right = Buffer.from(b, 'utf8')
  return left.length === right.length && timingSafeEqual(left, right)
}

/**
 * Request records, held in process memory until an hour after their time is up. Expiry is
 * evaluated on read, and old records are let go as new ones are made, so no record needs a
 * background timer and nothing outlives the process.
 */
export const createRequestStore = ({
  clock = Date.now,
  ttlMs = DEFAULT_TTL_MS,
  remoteTtlMs = REMOTE_TTL_MS,
  newId = () => hex(4),
  newSecretString = () => hex(16),
}: {
  clock?: () => number
  ttlMs?: number
  remoteTtlMs?: number
  newId?: () => string
  newSecretString?: () => string
} = {}) => {
  const records = new Map<string, SecretRequest>()
  const listeners = new Map<string, Set<() => void>>()
  /** Records whose write is under way, and when it started. Nothing is told until it lands. */
  const claims = new Map<string, number>()
  /** Records cancelled while their write was under way: closed if the write fails, left to it if it lands. */
  const cancelled = new Set<string>()

  const listenersFor = (id: string) => {
    const existing = listeners.get(id)
    if (existing !== undefined) return existing
    const created = new Set<() => void>()
    listeners.set(id, created)
    return created
  }

  const notify = (id: string) => {
    const waiting = listeners.get(id)
    listeners.delete(id)
    waiting?.forEach(listener => listener())
  }

  /** A record that leaves `awaiting` loses its seal key, so nothing sealed to it opens afterwards. */
  const withoutSealKey = ({ sealKey, ...rest }: SecretRequest): SecretRequest => rest

  const replace = (request: SecretRequest) => {
    const record = request.status === 'awaiting' ? request : withoutSealKey(request)
    records.set(record.id, record)
    if (record.status !== 'awaiting') notify(record.id)
    return record
  }

  /** A write under way, as long as it has not hung past the grace it is given. */
  const writing = (id: string) => {
    const since = claims.get(id)
    return since !== undefined && clock() - since <= CLAIM_GRACE_MS
  }

  /**
   * The record as it stands now, with a lapsed TTL applied before anyone reads it. A write
   * under way finishes first, unless it hangs past its grace.
   */
  const current = (id: string) => {
    const record = records.get(id)
    if (record === undefined) return undefined
    if (record.status !== 'awaiting' || writing(id) || clock() <= record.expiresAt) return record
    claims.delete(id)
    cancelled.delete(id)
    return replace({ ...record, status: 'expired' })
  }

  /** Lets go of requests long past their time, so a session that makes many keeps only recent ones. */
  const prune = () =>
    [...records.values()]
      .filter(record => clock() - record.expiresAt > KEPT_AFTER_EXPIRY_MS && !writing(record.id))
      .forEach(record => {
        records.delete(record.id)
        listeners.delete(record.id)
        claims.delete(record.id)
        cancelled.delete(record.id)
      })

  const freshId = (): string => {
    const candidate = newId()
    return records.has(candidate) ? freshId() : candidate
  }

  const create = ({
    secrets,
    reason,
    sink,
    sealKey,
    asker,
    ttlMs: requestTtlMs = sealKey === undefined ? ttlMs : remoteTtlMs,
  }: {
    secrets: readonly RequestedSecret[]
    reason: string
    sink: ResolvedSink
    /** Given for a remote request, whose page seals its values to the matching public key. */
    sealKey?: CryptoKey
    asker?: Asker
    ttlMs?: number
  }) => {
    prune()
    return replace({
      id: freshId(),
      secrets,
      reason,
      sink,
      token: newSecretString(),
      nonce: newSecretString(),
      expiresAt: clock() + requestTtlMs,
      status: 'awaiting',
      remote: sealKey !== undefined,
      ...(sealKey === undefined ? {} : { sealKey }),
      ...(asker === undefined ? {} : { asker }),
    })
  }

  /**
   * Keeps the link the agent was given to pass on, so every wait can hand it back while the
   * request is open: a host can fold away the message that first showed it.
   */
  const relay = (id: string, link: string) => {
    const record = current(id)
    if (record?.status !== 'awaiting') return record
    return replace({ ...record, link })
  }

  const byToken = (token: string) =>
    [...records.keys()]
      .map(current)
      .find(record => record !== undefined && sameToken(record.token, token))

  /**
   * Holds an open record while its values are written, so a second submission of the same
   * page cannot start another write. No waiter hears of it: the agent is told once the write
   * lands, and a write that fails releases the record for the human to try again.
   */
  const claim = (id: string) => {
    const record = current(id)
    if (record?.status !== 'awaiting' || writing(id)) return undefined
    claims.set(id, clock())
    return record
  }

  const close = (id: string) => {
    const record = current(id)
    if (record?.status !== 'awaiting') return record
    return replace({ ...record, status: 'expired' })
  }

  /** A write that did not land gives its record back, unless it was cancelled meanwhile. */
  const release = (id: string) => {
    claims.delete(id)
    if (cancelled.delete(id)) close(id)
  }

  const markWritten = (id: string, fingerprint?: { emoji: string; names: readonly string[] }) => {
    const record = current(id)
    claims.delete(id)
    cancelled.delete(id)
    if (record?.status !== 'awaiting') return undefined
    return replace({
      ...record,
      status: 'written',
      ...(fingerprint === undefined ? {} : { emoji: fingerprint.emoji, fingerprinted: fingerprint.names }),
    })
  }

  /**
   * Closes an open record. One whose write is under way is left to it: the values land and
   * the record is written, or the write fails and the record closes then.
   */
  const expire = (id: string) => {
    if (writing(id)) {
      cancelled.add(id)
      return current(id)
    }
    return close(id)
  }

  const afterTimeout = (ms: number) =>
    new Promise<void>(resolve => {
      setTimeout(resolve, ms).unref()
    })

  /** Registers one waiter and hands back the means to unregister it after a timeout. */
  const listenFor = (id: string) => {
    const waiting = listenersFor(id)
    const registered = new Set<() => void>()
    const settled = new Promise<void>(resolve => {
      registered.add(resolve)
      waiting.add(resolve)
    })
    return { settled, forget: () => registered.forEach(resolve => waiting.delete(resolve)) }
  }

  /** Resolves as soon as the record leaves `awaiting`, at its TTL, or at `timeoutMs`. */
  const waitFor = async (id: string, timeoutMs: number) => {
    const record = current(id)
    if (record?.status !== 'awaiting') return record
    const untilExpiry = Math.max(0, record.expiresAt - clock())
    const listener = listenFor(id)
    await Promise.race([listener.settled, afterTimeout(Math.min(timeoutMs, untilExpiry + EXPIRY_SLACK_MS))])
    listener.forget()
    return current(id)
  }

  /** How many requests are still waiting for their values, each TTL applied first. */
  const openCount = () => [...records.keys()].map(current).filter(record => record?.status === 'awaiting').length

  const expiresInSeconds = (request: SecretRequest) =>
    Math.max(0, Math.round((request.expiresAt - clock()) / 1000))

  return {
    create,
    get: current,
    relay,
    byToken,
    claim,
    release,
    markWritten,
    expire,
    waitFor,
    openCount,
    expiresInSeconds,
    ttlMs,
  }
}

export type RequestStore = ReturnType<typeof createRequestStore>
