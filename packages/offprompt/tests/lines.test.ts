import { describe, expect, it } from 'vitest'

import type { FieldRule } from '../src/core/rules.js'
import { encodeBytes, generatedRules, generatedSummary } from '../src/core/generated.js'
import { inSentence, withArticle } from '../src/core/wording.js'
import { hintFor, identify, lineFor, ownPrefix, spaceNote, type KnownKey } from '../src/web/client/lines.js'

const PREFIX: FieldRule = { kind: 'prefix', anyOf: ['whsec_'], message: 'starts with whsec_' }

const LENGTH: FieldRule = { kind: 'length', min: 24, max: 24, message: '24 characters' }

const POSTGRES: FieldRule = { kind: 'format', format: 'postgres', message: 'a postgres:// or postgresql:// URL with a host' }

const CHARSET: FieldRule = { kind: 'charset', pattern: '^[A-Za-z0-9]*$', message: 'letters and numbers only' }

const DASHBOARD = 'https://dashboard.stripe.com/apikeys'

const KNOWN: readonly KnownKey[] = [
  { ref: 'stripe/secret_key', provider: 'Stripe', label: 'Secret key', url: DASHBOARD, prefixes: ['sk_live_', 'sk_test_'] },
  { ref: 'stripe/publishable_key', provider: 'Stripe', label: 'Publishable key', url: DASHBOARD, prefixes: ['pk_live_'] },
  {
    ref: 'stripe/webhook_secret',
    provider: 'Stripe',
    label: 'Webhook signing secret',
    url: 'https://dashboard.stripe.com/webhooks',
    prefixes: ['whsec_'],
  },
  { ref: 'openai/api_key', provider: 'OpenAI', label: 'API key', url: 'https://platform.openai.com', prefixes: ['sk-'] },
  { ref: 'anthropic/api_key', provider: 'Anthropic', label: 'API key', url: 'https://console.anthropic.com', prefixes: ['sk-ant-'] },
]

const known = (ref: string) => KNOWN.find(key => key.ref === ref)

const PREFIXES = KNOWN.flatMap(key => key.prefixes)

describe('a value’s own prefix', () => {
  it('is a prefix the page knows, the longest one, or a URL scheme', () => {
    expect(ownPrefix({ value: 'pk_live_51Hx9Qx7', prefixes: PREFIXES })).toBe('pk_live_')
    expect(ownPrefix({ value: 'sk-ant-api03-abc', prefixes: PREFIXES })).toBe('sk-ant-')
    expect(ownPrefix({ value: 'mysql://acme:secret@db/acme', prefixes: [] })).toBe('mysql://')
  })

  it('is nothing for a value that starts with nothing the page knows, however it looks', () => {
    expect(ownPrefix({ value: 'Xa91bKq7Lm4QzR2vT8p', prefixes: PREFIXES })).toBe('')
    expect(ownPrefix({ value: 'Kx_Tq-Zp_4f9a', prefixes: PREFIXES })).toBe('')
    expect(ownPrefix({ value: 'blue-cat-dog-horse', prefixes: PREFIXES })).toBe('')
  })
})

describe('the line under a rule', () => {
  it('is idle for an empty value and passes a kept rule', () => {
    expect(lineFor({ rule: PREFIX, value: '', typing: false })).toEqual({ state: 'idle', detail: '' })
    expect(lineFor({ rule: PREFIX, value: 'whsec_abc', typing: false })).toEqual({ state: 'pass', detail: '' })
  })

  it('says how long a value is once it is wrong, and how far along while it is typed', () => {
    expect(lineFor({ rule: LENGTH, value: 'a'.repeat(19), typing: false })).toEqual({ state: 'fail', detail: 'got 19' })
    expect(lineFor({ rule: LENGTH, value: 'a'.repeat(14), typing: true })).toEqual({ state: 'pending', detail: '14 so far' })
    expect(lineFor({ rule: LENGTH, value: 'a'.repeat(30), typing: true })).toEqual({ state: 'fail', detail: 'got 30' })
  })

  it('names the prefix a wrong value starts with', () => {
    expect(lineFor({ rule: PREFIX, value: 'sk-proj-abc', typing: false, known: PREFIXES })).toEqual({
      state: 'fail',
      detail: 'got sk-',
    })
    expect(lineFor({ rule: PREFIX, value: 'Kx_Tq-Zp_4f9a', typing: false, known: PREFIXES })).toEqual({
      state: 'fail',
      detail: '',
    })
    expect(lineFor({ rule: POSTGRES, value: 'mysql://acme@db/acme', typing: false })).toEqual({
      state: 'fail',
      detail: 'got mysql://',
    })
  })

  it('waits while a typed value is still on its way to the prefix', () => {
    expect(lineFor({ rule: PREFIX, value: 'whs', typing: true })).toEqual({ state: 'pending', detail: '' })
    expect(lineFor({ rule: PREFIX, value: 'whs', typing: false })).toEqual({ state: 'fail', detail: '' })
  })

  it('says nothing more for a rule that has nothing short and safe to say', () => {
    expect(lineFor({ rule: CHARSET, value: 'abc-def', typing: false })).toEqual({ state: 'fail', detail: '' })
  })
})

describe('recognising another key', () => {
  it('prefers the longest prefix a value matches', () => {
    expect(identify({ value: 'sk-ant-api03-xyz', known: KNOWN })?.ref).toBe('anthropic/api_key')
    expect(identify({ value: 'sk-proj-xyz', known: KNOWN })?.ref).toBe('openai/api_key')
  })

  it('points to the right key on the same dashboard page', () => {
    expect(hintFor({ value: 'pk_live_abc', own: known('stripe/secret_key'), known: KNOWN })).toBe(
      "That's the publishable key. Use the secret key from the same page.",
    )
  })

  it('names another of the same provider’s keys from another page', () => {
    expect(hintFor({ value: 'sk_live_abc', own: known('stripe/webhook_secret'), known: KNOWN })).toBe(
      "That's the Stripe secret key, not the webhook signing secret.",
    )
  })

  it('names another provider’s key', () => {
    expect(hintFor({ value: 'sk-proj-abc', own: known('stripe/webhook_secret'), known: KNOWN })).toBe(
      'This looks like an OpenAI API key.',
    )
    expect(hintFor({ value: 'sk-proj-abc', own: undefined, known: KNOWN })).toBe('This looks like an OpenAI API key.')
  })

  it('takes the field’s own provider where another provider shares the prefix, and names neither of two others', () => {
    const clerk: KnownKey = {
      ref: 'clerk/publishable_key',
      provider: 'Clerk',
      label: 'Publishable key',
      url: 'https://dashboard.clerk.com',
      prefixes: ['pk_live_', 'pk_test_'],
    }
    const clerkFirst = [clerk, ...KNOWN]
    expect(hintFor({ value: 'pk_live_abc', own: known('stripe/secret_key'), known: clerkFirst })).toBe(
      "That's the publishable key. Use the secret key from the same page.",
    )
    expect(hintFor({ value: 'pk_live_abc', own: known('openai/api_key'), known: clerkFirst })).toBe('')
  })

  it('says nothing for a value it does not recognise, or for the field’s own key', () => {
    expect(hintFor({ value: 'Xa91bKq7', own: known('stripe/secret_key'), known: KNOWN })).toBe('')
    expect(hintFor({ value: 'sk_live_short', own: known('stripe/secret_key'), known: KNOWN })).toBe('')
  })
})

describe('spaces at either end', () => {
  it('are pointed out, and a value without them is left alone', () => {
    expect(spaceNote('9f3c e21b ')).toBe('Ends with a space. It will be written exactly as typed unless you trim it.')
    expect(spaceNote(' 9f3c')).toBe('Starts with a space. It will be written exactly as typed unless you trim it.')
    expect(spaceNote(' 9f3c ')).toBe('Starts and ends with a space. It will be written exactly as typed unless you trim it.')
    expect(spaceNote('9f3c e21b')).toBe('')
  })
})

describe('wording', () => {
  it('lowers a label into a sentence, but keeps an acronym', () => {
    expect(inSentence('Secret key')).toBe('secret key')
    expect(inSentence('API key')).toBe('API key')
    expect(inSentence('JWT')).toBe('JWT')
  })

  it('picks the article by how the word is said', () => {
    expect(withArticle('OpenAI API key')).toBe('an OpenAI API key')
    expect(withArticle('Stripe secret key')).toBe('a Stripe secret key')
    expect(withArticle('URL')).toBe('a URL')
    expect(withArticle('Upstash QStash token')).toBe('an Upstash QStash token')
    expect(withArticle('UploadThing token')).toBe('an UploadThing token')
    expect(withArticle('UUID')).toBe('a UUID')
    expect(withArticle('email address')).toBe('an email address')
  })
})

describe('generated values', () => {
  it('are written out the same way in the page and on the server', () => {
    const bytes = new Uint8Array([0xfb, 0xff, 0x00, 0x10])
    expect(encodeBytes(bytes, 'hex')).toBe('fbff0010')
    expect(encodeBytes(bytes, 'base64')).toBe(Buffer.from(bytes).toString('base64'))
    expect(encodeBytes(bytes, 'base64url')).toBe(Buffer.from(bytes).toString('base64url'))
  })

  it('check a pasted one against what offprompt would make', () => {
    expect(generatedRules({ bytes: 32, encoding: 'hex' }).map(rule => rule.message)).toEqual([
      'at least 64 hex characters · 32 bytes',
      'hex only · 0–9 and a–f',
    ])
    expect(generatedSummary({ bytes: 32, encoding: 'hex' })).toBe('Looks like a 32-byte hex secret')
    expect(generatedSummary({ bytes: 18, encoding: 'base64url' })).toBe('Looks like an 18-byte base64url secret')
  })
})
