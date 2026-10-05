import { describe, expect, it } from 'vitest'

import { failures } from '../../checks.js'
import { apiKey } from './api-key.js'
import { sendingDomain } from './sending-domain.js'

const LINE = 'a key- key, or the newer hex key in groups of 32, 8 and 8 joined by dashes'

describe('Mailgun API key', () => {
  it('accepts the older key- key', () => {
    expect(failures(apiKey.rules, `key-${'a'.repeat(32)}`)).toEqual([])
  })

  it('accepts the newer key, hex in groups of 32, 8 and 8', () => {
    expect(failures(apiKey.rules, `${'a'.repeat(32)}-${'1'.repeat(8)}-${'b'.repeat(8)}`)).toEqual([])
    expect(failures(apiKey.rules, `${'A'.repeat(32)}-${'1'.repeat(8)}-${'B'.repeat(8)}`)).toEqual([])
  })

  it('refuses another provider key, a key that is cut short, and the key id alone', () => {
    expect(failures(apiKey.rules, `SG.${'a'.repeat(22)}.${'b'.repeat(43)}`)).toEqual([LINE])
    expect(failures(apiKey.rules, `${'a'.repeat(32)}-${'1'.repeat(8)}`)).toEqual([LINE])
    expect(failures(apiKey.rules, `${'1'.repeat(8)}-${'b'.repeat(8)}`)).toEqual([LINE])
    expect(failures(apiKey.rules, 'key-short')).toEqual([LINE])
  })
})

describe('Mailgun sending domain', () => {
  it('accepts a domain and a subdomain', () => {
    expect(failures(sendingDomain.rules, 'example.com')).toEqual([])
    expect(failures(sendingDomain.rules, 'mg.example.com')).toEqual([])
    expect(failures(sendingDomain.rules, `sandbox${'0'.repeat(32)}.mailgun.org`)).toEqual([])
  })

  it('refuses a URL, an email address and a bare name, which are not a domain', () => {
    const line = 'a hostname, with no https:// or path'
    expect(failures(sendingDomain.rules, 'https://mg.example.com')).toEqual([line])
    expect(failures(sendingDomain.rules, 'you@example.com')).toEqual([line])
    expect(failures(sendingDomain.rules, 'mailgun')).toEqual([line])
  })
})
