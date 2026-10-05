import { describe, expect, it } from 'vitest'

import { failures } from '../../checks.js'
import { apiToken } from './api-token.js'

describe('Replicate API token', () => {
  it('accepts a token of 40 characters', () => {
    expect(failures(apiToken.rules, `r8_${'a'.repeat(37)}`)).toEqual([])
  })

  it('refuses a Hugging Face token pasted by mistake, and reports a short one', () => {
    expect(failures(apiToken.rules, `hf_${'a'.repeat(34)}`)).toEqual(['starts with r8_'])
    expect(failures(apiToken.rules, 'r8_short')).toEqual(['30 to 128 characters'])
    expect(failures(apiToken.rules, 'short')).toEqual(['starts with r8_', '30 to 128 characters'])
  })
})
