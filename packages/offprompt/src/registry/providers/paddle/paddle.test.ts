import { describe, expect, it } from 'vitest'

import { failures } from '../../checks.js'
import { apiKey } from './api-key.js'
import { clientToken } from './client-token.js'
import { webhookSecret } from './webhook-secret.js'

const sandboxKey = `pdl_sdbx_apikey_${'a'.repeat(26)}_${'b'.repeat(22)}_${'c'.repeat(3)}`
const liveKey = `pdl_live_apikey_${'a'.repeat(26)}_${'b'.repeat(22)}_${'c'.repeat(3)}`
const CLIENT_TOKEN = `live_${'a'.repeat(27)}`
const WEBHOOK_SECRET = `pdl_ntfset_${'a'.repeat(26)}_${'b'.repeat(32)}`

describe('Paddle API key', () => {
  it('accepts a sandbox or live key, and a legacy 50-character one', () => {
    expect(failures(apiKey.rules, sandboxKey)).toEqual([])
    expect(failures(apiKey.rules, liveKey)).toEqual([])
    expect(failures(apiKey.rules, 'a1'.repeat(25))).toEqual([])
  })

  it('refuses the client-side token where the API key goes', () => {
    expect(failures(apiKey.rules, CLIENT_TOKEN)).toEqual([
      'a pdl_sdbx_apikey_ or pdl_live_apikey_ key, or a legacy 50-character key',
    ])
  })

  it('refuses a key from another provider', () => {
    expect(failures(apiKey.rules, `sk_live_${'a'.repeat(40)}`)).toEqual([
      'a pdl_sdbx_apikey_ or pdl_live_apikey_ key, or a legacy 50-character key',
    ])
  })
})

describe('Paddle client-side token', () => {
  it('accepts a sandbox or live token, and is meant to be public', () => {
    expect(failures(clientToken.rules, CLIENT_TOKEN)).toEqual([])
    expect(failures(clientToken.rules, `test_${'a'.repeat(27)}`)).toEqual([])
    expect(clientToken.secret).toBe(false)
  })

  it('refuses the secret API key there, and reports each line a short value breaks', () => {
    expect(failures(clientToken.rules, sandboxKey)).toEqual(['starts with test_ or live_', '20 to 64 characters'])
    expect(failures(clientToken.rules, 'live_short')).toEqual(['20 to 64 characters'])
  })
})

describe('Paddle notification destination secret key', () => {
  it('accepts a secret key and refuses an API key in its place', () => {
    expect(failures(webhookSecret.rules, WEBHOOK_SECRET)).toEqual([])
    expect(failures(webhookSecret.rules, sandboxKey)).toEqual(['starts with pdl_ntfset_'])
  })
})
