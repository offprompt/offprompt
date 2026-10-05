import { describe, expect, it } from 'vitest'

import { failures } from '../../checks.js'
import { clientId } from './client-id.js'
import { clientSecret } from './client-secret.js'
import { domain } from './domain.js'

const DOMAIN_MESSAGE = 'a hostname such as example.us.auth0.com, without https://'

describe('Auth0 domain', () => {
  it('accepts a tenant domain and a custom one, and is meant to be public', () => {
    expect(failures(domain.rules, 'example.us.auth0.com')).toEqual([])
    expect(failures(domain.rules, 'login.example.com')).toEqual([])
    expect(domain.secret).toBe(false)
  })

  it('refuses a URL, which nextjs-auth0 does not take in its place', () => {
    expect(failures(domain.rules, 'https://example.us.auth0.com')).toEqual([DOMAIN_MESSAGE])
    expect(failures(domain.rules, 'example.us.auth0.com/')).toEqual([DOMAIN_MESSAGE])
  })
})

describe('Auth0 client ID', () => {
  it('accepts an ID, is meant to be public, and reports a short value', () => {
    expect(failures(clientId.rules, 'a'.repeat(32))).toEqual([])
    expect(clientId.secret).toBe(false)
    expect(failures(clientId.rules, 'short')).toEqual(['16 to 64 characters'])
  })
})

describe('Auth0 client secret', () => {
  it('accepts a secret and reports a short value', () => {
    expect(failures(clientSecret.rules, 'a'.repeat(64))).toEqual([])
    expect(failures(clientSecret.rules, 'short')).toEqual(['at least 16 characters'])
  })
})
