import { describe, expect, it } from 'vitest'

import { failures } from '../../checks.js'
import { adminApiAccessToken } from './admin-api-access-token.js'
import { clientId } from './client-id.js'
import { clientSecret } from './client-secret.js'

const TOKEN = `shpat_${'a'.repeat(32)}`
const SECRET = `shpss_${'a'.repeat(32)}`
const TOKEN_MESSAGE = 'a shpat_ token, or an older 32-character hex token'
const SECRET_MESSAGE = 'a shpss_ secret, or an older 32-character hex secret'

describe('Shopify Admin API access token', () => {
  it('accepts a prefixed token, a custom app one, and an older unprefixed hex one', () => {
    expect(failures(adminApiAccessToken.rules, TOKEN)).toEqual([])
    expect(failures(adminApiAccessToken.rules, `shpca_${'a'.repeat(32)}`)).toEqual([])
    expect(failures(adminApiAccessToken.rules, 'a1'.repeat(16))).toEqual([])
  })

  it('refuses the client secret where the token goes', () => {
    expect(failures(adminApiAccessToken.rules, SECRET)).toEqual([TOKEN_MESSAGE])
  })

  it('refuses a key from another provider', () => {
    expect(failures(adminApiAccessToken.rules, `sk_live_${'a'.repeat(40)}`)).toEqual([TOKEN_MESSAGE])
  })
})

describe('Shopify client ID', () => {
  it('accepts an ID, is meant to be public, and reports a short value', () => {
    expect(failures(clientId.rules, 'a1'.repeat(16))).toEqual([])
    expect(clientId.secret).toBe(false)
    expect(failures(clientId.rules, 'abc')).toEqual(['20 to 64 characters'])
  })
})

describe('Shopify client secret', () => {
  it('accepts a prefixed secret and an older 32-character hex one', () => {
    expect(failures(clientSecret.rules, SECRET)).toEqual([])
    expect(failures(clientSecret.rules, 'a1'.repeat(16))).toEqual([])
  })

  it('refuses the access token where the secret goes', () => {
    expect(failures(clientSecret.rules, TOKEN)).toEqual([SECRET_MESSAGE])
  })
})
