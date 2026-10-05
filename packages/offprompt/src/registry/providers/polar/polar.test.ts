import { describe, expect, it } from 'vitest'

import { failures } from '../../checks.js'
import { accessToken } from './access-token.js'

describe('Polar access token', () => {
  it('accepts an organization access token, and a personal one', () => {
    expect(failures(accessToken.rules, `polar_oat_${'a'.repeat(43)}`)).toEqual([])
    expect(failures(accessToken.rules, `polar_pat_${'a'.repeat(43)}`)).toEqual([])
  })

  it('refuses a key from another provider', () => {
    expect(failures(accessToken.rules, `sk_live_${'a'.repeat(40)}`)).toEqual(['starts with polar_oat_ or polar_pat_'])
  })

  it('refuses a webhook secret where the access token goes', () => {
    expect(failures(accessToken.rules, `whsec_${'a'.repeat(40)}`)).toEqual(['starts with polar_oat_ or polar_pat_'])
  })

  it('reports a token cut short', () => {
    expect(failures(accessToken.rules, 'polar_oat_short')).toEqual(['at least 30 characters'])
  })
})
