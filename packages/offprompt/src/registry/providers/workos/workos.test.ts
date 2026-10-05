import { describe, expect, it } from 'vitest'

import { failures } from '../../checks.js'
import { apiKey } from './api-key.js'
import { clientId } from './client-id.js'

const API_KEY = `sk_test_${'a'.repeat(40)}`
const CLIENT_ID = `client_01${'A'.repeat(24)}`

describe('WorkOS API key', () => {
  it('accepts a staging or production key', () => {
    expect(failures(apiKey.rules, API_KEY)).toEqual([])
    expect(failures(apiKey.rules, `sk_live_${'a'.repeat(80)}`)).toEqual([])
  })

  it('refuses the client ID where the API key goes', () => {
    expect(failures(apiKey.rules, CLIENT_ID)).toEqual(['starts with sk_'])
  })

  it('refuses a key from another provider', () => {
    expect(failures(apiKey.rules, `re_${'a'.repeat(30)}`)).toEqual(['starts with sk_'])
  })
})

describe('WorkOS client ID', () => {
  it('accepts an ID, and is meant to be public', () => {
    expect(failures(clientId.rules, CLIENT_ID)).toEqual([])
    expect(clientId.secret).toBe(false)
  })

  it('refuses the secret API key there', () => {
    expect(failures(clientId.rules, API_KEY)).toEqual(['starts with client_'])
  })

  it('reports an ID cut short', () => {
    expect(failures(clientId.rules, 'client_1')).toEqual(['10 to 80 characters'])
  })
})
