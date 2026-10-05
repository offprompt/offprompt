import { describe, expect, it } from 'vitest'

import { failures } from '../../checks.js'
import { authToken } from './auth-token.js'
import { databaseUrl } from './database-url.js'

const TOKEN =
  'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpZCI6ImV4YW1wbGUifQ.ZXhhbXBsZS1zaWduYXR1cmUtZXhhbXBsZS1zaWduYXR1cmU'

describe('Turso database URL', () => {
  it('accepts a libsql:// URL, and an https:// one for the HTTP API', () => {
    expect(failures(databaseUrl.rules, 'libsql://example-db-example-org.turso.io')).toEqual([])
    expect(failures(databaseUrl.rules, 'wss://example-db-example-org.turso.io')).toEqual([])
    expect(failures(databaseUrl.rules, 'https://example-db-example-org.turso.io')).toEqual([])
  })

  it('refuses a Postgres URL, and the auth token where the URL goes', () => {
    expect(failures(databaseUrl.rules, 'postgresql://app:example@db.example.com:5432/app')).toEqual([
      'a libsql:// or https:// URL',
    ])
    expect(failures(databaseUrl.rules, TOKEN)).toEqual(['a libsql:// or https:// URL'])
  })

  it('refuses a scheme with no host after it', () => {
    expect(failures(databaseUrl.rules, 'libsql://')).toEqual(['at least 12 characters'])
  })
})

describe('Turso auth token', () => {
  it('accepts a JWT', () => {
    expect(failures(authToken.rules, TOKEN)).toEqual([])
  })

  it('refuses the database URL where the token goes, and plain text', () => {
    expect(failures(authToken.rules, 'libsql://example-db-example-org.turso.io')).toEqual([
      'a JWT, three base64url parts separated by dots',
    ])
    expect(failures(authToken.rules, 'a'.repeat(40))).toEqual(['a JWT, three base64url parts separated by dots'])
  })
})
