import { afterEach, expect, it, vi } from 'vitest'

import { newSealPair } from '../src/core/sealing.js'
import type { ResolvedSink } from '../src/core/sinks.js'
import { CLAIM_GRACE_MS, createRequestStore, KEPT_AFTER_EXPIRY_MS, type TypedValue } from '../src/core/store.js'

const PLAIN: TypedValue = { kind: 'typed', rules: [], multiline: false, masked: true, offers: [] }

const sink: ResolvedSink = {
  kind: 'dotenv',
  absolutePath: '/tmp/project/.env',
  relativePath: '.env',
  tracked: false,
  ignored: true,
  exists: true,
}

const oneSecret = [{ name: 'RESEND_API_KEY', value: PLAIN, overwrites: false }]

const setupTest = ({ now = 1_000_000, ttlMs = 300_000 } = {}) => {
  const clock = vi.fn(() => now)
  const store = createRequestStore({ clock, ttlMs })
  const open = () => store.create({ secrets: oneSecret, reason: 'the sender reads it', sink })
  const advance = (ms: number) => clock.mockImplementation(() => now + ms)
  return { store, open, advance, ttlMs }
}

afterEach(() => {
  vi.useRealTimers()
})

it('opens a request in the awaiting state', () => {
  const { store, open } = setupTest()
  const request = open()
  expect(request.status).toBe('awaiting')
  expect(store.get(request.id)?.status).toBe('awaiting')
  expect(store.expiresInSeconds(request)).toBe(300)
})

it('gives every request its own token and nonce', () => {
  const { open } = setupTest()
  const [first, second] = [open(), open()]
  expect(first.id).not.toBe(second.id)
  expect(first.token).not.toBe(second.token)
  expect(first.nonce).not.toBe(second.nonce)
  expect(first.token).not.toBe(first.nonce)
})

it('finds a request by its token and ignores a token of the wrong length', () => {
  const { store, open } = setupTest()
  const request = open()
  expect(store.byToken(request.token)?.id).toBe(request.id)
  expect(store.byToken(request.token.slice(0, -1))).toBeUndefined()
  expect(store.byToken('0'.repeat(32))).toBeUndefined()
})

it('closes the record on a successful write', () => {
  const { store, open } = setupTest()
  const request = open()
  expect(store.get(request.id)?.status).toBe('awaiting')
  expect(store.markWritten(request.id)?.status).toBe('written')
  expect(store.get(request.id)?.status).toBe('written')
  expect(store.markWritten(request.id)).toBeUndefined()
})

it('expires a request on cancellation and discards nothing else', () => {
  const { store, open } = setupTest()
  const [cancelled, kept] = [open(), open()]
  expect(store.expire(cancelled.id)?.status).toBe('expired')
  expect(store.get(kept.id)?.status).toBe('awaiting')
})

it('reports a request as expired once its TTL has lapsed', () => {
  const { store, open, advance, ttlMs } = setupTest()
  const request = open()
  expect(store.get(request.id)?.status).toBe('awaiting')
  advance(ttlMs + 1)
  expect(store.get(request.id)?.status).toBe('expired')
  expect(store.expiresInSeconds(request)).toBe(0)
})

it('reports an unknown id as absent rather than expired', () => {
  const { store } = setupTest()
  expect(store.get('nosuchid')).toBeUndefined()
  expect(store.expire('nosuchid')).toBeUndefined()
})

it('lets go of a request an hour after its time is up, as new ones are made', () => {
  const { store, open, advance, ttlMs } = setupTest()
  const old = open()

  advance(ttlMs + KEPT_AFTER_EXPIRY_MS)
  open()
  expect(store.get(old.id)?.status).toBe('expired')

  advance(ttlMs + KEPT_AFTER_EXPIRY_MS + 1)
  open()
  expect(store.get(old.id)).toBeUndefined()
  expect(store.byToken(old.token)).toBeUndefined()
})

it('resolves a waiter as soon as the value is written', async () => {
  const { store, open } = setupTest()
  const request = open()
  const waiting = store.waitFor(request.id, 60_000)
  store.markWritten(request.id)
  await expect(waiting).resolves.toMatchObject({ status: 'written' })
})

it('resolves a waiter on cancellation', async () => {
  const { store, open } = setupTest()
  const request = open()
  const waiting = store.waitFor(request.id, 60_000)
  store.expire(request.id)
  await expect(waiting).resolves.toMatchObject({ status: 'expired' })
})

it('returns the request still awaiting when the poll times out first', async () => {
  const { store, open } = setupTest()
  const request = open()
  await expect(store.waitFor(request.id, 5)).resolves.toMatchObject({ status: 'awaiting' })
})

it('stops waiting at the TTL even when the poll window is longer', async () => {
  const { store, open, advance } = setupTest({ ttlMs: 10 })
  const request = open()
  const waiting = store.waitFor(request.id, 60_000)
  advance(11)
  await expect(waiting).resolves.toMatchObject({ status: 'expired' })
})

it('answers immediately for a request that is already closed', async () => {
  const { store, open } = setupTest()
  const request = open()
  store.markWritten(request.id)
  await expect(store.waitFor(request.id, 60_000)).resolves.toMatchObject({ status: 'written' })
})

it('gives a local request five minutes and a remote one thirty', async () => {
  const now = { ms: 1_000_000 }
  const store = createRequestStore({ clock: () => now.ms })
  const { sealKey } = await newSealPair()
  const local = store.create({ secrets: oneSecret, reason: 'needed', sink })
  const remote = store.create({ secrets: oneSecret, reason: 'needed', sink, sealKey })

  expect(local.remote).toBe(false)
  expect(remote.remote).toBe(true)
  expect(store.expiresInSeconds(local)).toBe(300)
  expect(store.expiresInSeconds(remote)).toBe(1800)

  now.ms += 300_000 + 1
  expect(store.get(local.id)?.status).toBe('expired')
  expect(store.get(remote.id)?.status).toBe('awaiting')

  now.ms += 25 * 60_000
  expect(store.get(remote.id)?.status).toBe('expired')
})

it('holds a record while its write is under way, and tells no one until it lands', async () => {
  const { store, open } = setupTest()
  const request = open()
  const heard: string[] = []
  void store.waitFor(request.id, 60_000).then(record => heard.push(record?.status ?? 'none'))

  expect(store.claim(request.id)?.id).toBe(request.id)
  expect(store.claim(request.id)).toBeUndefined()
  await Promise.resolve()
  expect(heard).toEqual([])
  expect(store.get(request.id)?.status).toBe('awaiting')

  store.markWritten(request.id, { emoji: '🦊 🌵 🎈 🧭', names: ['RESEND_API_KEY'] })
  await new Promise(resolve => setTimeout(resolve, 0))
  expect(heard).toEqual(['written'])
})

it('gives a record back when its write fails, for another go', () => {
  const { store, open } = setupTest()
  const request = open()

  store.claim(request.id)
  store.release(request.id)

  expect(store.claim(request.id)?.id).toBe(request.id)
})

it('lets a write under way finish past the record’s expiry', () => {
  const { store, open, advance, ttlMs } = setupTest()
  const request = open()

  advance(ttlMs - 10)
  store.claim(request.id)
  advance(ttlMs + 1)

  expect(store.markWritten(request.id)?.status).toBe('written')
})

it('lets a cancel wait for a write under way: written if it lands', () => {
  const { store, open } = setupTest()
  const request = open()

  store.claim(request.id)
  expect(store.expire(request.id)?.status).toBe('awaiting')

  expect(store.markWritten(request.id)?.status).toBe('written')
})

it('lets a cancel wait for a write under way: closed if it fails', () => {
  const { store, open } = setupTest()
  const request = open()

  store.claim(request.id)
  store.expire(request.id)
  store.release(request.id)

  expect(store.get(request.id)?.status).toBe('expired')
})

it('expires a record whose write hangs past its grace', () => {
  const { store, open, advance, ttlMs } = setupTest()
  const request = open()

  store.claim(request.id)
  advance(ttlMs + CLAIM_GRACE_MS + 1)

  expect(store.get(request.id)?.status).toBe('expired')
})
