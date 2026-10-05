import { describe, expect, it } from 'vitest'

import { failures } from '../../checks.js'
import { userAccessToken } from './user-access-token.js'

describe('Hugging Face user access token', () => {
  it('accepts a token', () => {
    expect(failures(userAccessToken.rules, `hf_${'a'.repeat(34)}`)).toEqual([])
  })

  it('refuses a Replicate token pasted by mistake, and reports a short one', () => {
    expect(failures(userAccessToken.rules, `r8_${'a'.repeat(37)}`)).toEqual(['starts with hf_'])
    expect(failures(userAccessToken.rules, 'hf_short')).toEqual(['at least 30 characters'])
    expect(failures(userAccessToken.rules, 'short')).toEqual(['starts with hf_', 'at least 30 characters'])
  })
})
