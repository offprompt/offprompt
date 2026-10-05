import { describe, expect, it } from 'vitest'

import { failures } from '../../checks.js'
import { personalAccessToken } from './personal-access-token.js'

describe('Netlify personal access token', () => {
  it('accepts an nfp_ token, a CLI one, and an older one with no prefix', () => {
    expect(failures(personalAccessToken.rules, `nfp_${'a'.repeat(36)}`)).toEqual([])
    expect(failures(personalAccessToken.rules, `nfc_${'a'.repeat(36)}`)).toEqual([])
    expect(failures(personalAccessToken.rules, 'a'.repeat(43))).toEqual([])
  })

  it('refuses a value cut short, under one line', () => {
    expect(failures(personalAccessToken.rules, `nfp_${'a'.repeat(12)}`)).toEqual(['at least 40 characters'])
    expect(failures(personalAccessToken.rules, 'a'.repeat(24))).toEqual(['at least 40 characters'])
  })
})
