import { describe, expect, it } from 'vitest'

import { failures } from '../../checks.js'
import { authToken } from './auth-token.js'
import { dsn } from './dsn.js'

const TOKEN = 'a sntrys_ or sntryu_ token, or an older 64-character hex token'

const URL_LINE = 'a URL starting with http:// or https://'

const DSN_LINE = 'the key, @, then the host, as Sentry shows it'

describe('Sentry auth token', () => {
  it('accepts an organization token, a personal token, and an older hex one', () => {
    expect(failures(authToken.rules, `sntrys_${'a'.repeat(120)}_${'b'.repeat(43)}`)).toEqual([])
    expect(failures(authToken.rules, `sntryu_${'a'.repeat(64)}`)).toEqual([])
    expect(failures(authToken.rules, 'a'.repeat(64))).toEqual([])
  })

  it('refuses the DSN and a PostHog key pasted where the token goes', () => {
    expect(failures(authToken.rules, 'https://examplePublicKey@o0.ingest.sentry.io/0')).toEqual([TOKEN])
    expect(failures(authToken.rules, `phx_${'a'.repeat(43)}`)).toEqual([TOKEN])
  })

  it('refuses a token cut short, and a hex one of the wrong length', () => {
    expect(failures(authToken.rules, 'sntryu_short')).toEqual([TOKEN])
    expect(failures(authToken.rules, 'a'.repeat(63))).toEqual([TOKEN])
    expect(failures(authToken.rules, 'g'.repeat(64))).toEqual([TOKEN])
  })
})

describe('Sentry DSN', () => {
  it('accepts a DSN from sentry.io and one from a self-hosted install', () => {
    expect(failures(dsn.rules, 'https://examplePublicKey@o0.ingest.sentry.io/0')).toEqual([])
    expect(failures(dsn.rules, 'http://examplePublicKey@sentry.example.com:9000/1')).toEqual([])
  })

  it('refuses an auth token, plain text, and a Sentry page address where the DSN goes', () => {
    expect(failures(dsn.rules, `sntrys_${'a'.repeat(120)}`)).toEqual([URL_LINE, DSN_LINE])
    expect(failures(dsn.rules, 'my-project')).toEqual([URL_LINE, DSN_LINE])
    expect(failures(dsn.rules, 'https://sentry.io/settings/projects/')).toEqual([DSN_LINE])
  })
})
