import { describe, expect, it } from 'vitest'

import { failures } from '../../checks.js'
import { accessToken } from './access-token.js'

const LINE = 'a vcp_ token, or an older token of 24 letters and numbers'

describe('Vercel access token', () => {
  it('accepts a personal, an integration and an app token, underscores included', () => {
    expect(failures(accessToken.rules, `vcp_${'a1_B'.repeat(14)}`)).toEqual([])
    expect(failures(accessToken.rules, `vci_${'a'.repeat(40)}`)).toEqual([])
    expect(failures(accessToken.rules, `vca_${'a'.repeat(40)}`)).toEqual([])
  })

  it('accepts a token made before the prefixes, of 24 letters and numbers', () => {
    expect(failures(accessToken.rules, 'gGP4GJRR3TOpU7wzTY9UiSTQ')).toEqual([])
  })

  it('refuses a refresh token, an API key, a token cut short and an older one with a symbol', () => {
    expect(failures(accessToken.rules, `vcr_${'a'.repeat(40)}`)).toEqual([LINE])
    expect(failures(accessToken.rules, `vck_${'a'.repeat(40)}`)).toEqual([LINE])
    expect(failures(accessToken.rules, 'vcp_aaaa')).toEqual([LINE])
    expect(failures(accessToken.rules, 'gGP4GJRR3TOp?7wzTY9UiSTQ')).toEqual([LINE])
  })
})
