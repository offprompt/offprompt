import { describe, expect, it } from 'vitest'

import { failures } from '../../checks.js'
import { apiKey } from './api-key.js'

// SG.<22 character id>.<43 character secret>, 69 characters in all.
const KEY = `SG.${'a'.repeat(22)}.${'b'.repeat(43)}`

describe('SendGrid API key', () => {
  it('accepts a key', () => {
    expect(failures(apiKey.rules, KEY)).toEqual([])
    expect(failures(apiKey.rules, `SG.${'aB_-'.repeat(6).slice(0, 22)}.${'cD-_'.repeat(11).slice(0, 43)}`)).toEqual([])
  })

  it('refuses the key id alone, which is only the first part of a key', () => {
    expect(failures(apiKey.rules, `SG.${'a'.repeat(22)}`)).toEqual(['at least 50 characters'])
  })

  it('refuses another provider key and a key pasted without its prefix', () => {
    expect(failures(apiKey.rules, `key-${'a'.repeat(32)}`)).toEqual(['starts with SG.', 'at least 50 characters'])
    expect(failures(apiKey.rules, `re_${'a'.repeat(60)}`)).toEqual(['starts with SG.'])
    expect(failures(apiKey.rules, KEY.slice(3))).toEqual(['starts with SG.'])
  })
})
