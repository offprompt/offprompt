import { describe, expect, it } from 'vitest'

import { failures } from '../../checks.js'
import { apiKey } from './api-key.js'

describe('Together AI API key', () => {
  it('accepts a tgp_v1_ key and a legacy key with no prefix', () => {
    expect(failures(apiKey.rules, `tgp_v1_${'a'.repeat(43)}`)).toEqual([])
    expect(failures(apiKey.rules, 'a'.repeat(64))).toEqual([])
  })

  it('refuses a key cut short on the clipboard, and a Resend key', () => {
    expect(failures(apiKey.rules, 'tgp_v1_aaaa')).toEqual(['at least 40 characters'])
    expect(failures(apiKey.rules, `re_${'a'.repeat(32)}`)).toEqual(['at least 40 characters'])
  })
})
