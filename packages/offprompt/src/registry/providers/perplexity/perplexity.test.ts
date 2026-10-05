import { describe, expect, it } from 'vitest'

import { failures } from '../../checks.js'
import { apiKey } from './api-key.js'

describe('Perplexity API key', () => {
  it('accepts a key', () => {
    expect(failures(apiKey.rules, `pplx-${'a'.repeat(48)}`)).toEqual([])
  })

  it('refuses a key from another provider, and one cut short', () => {
    expect(failures(apiKey.rules, `sk-proj-${'a'.repeat(50)}`)).toEqual(['starts with pplx-'])
    expect(failures(apiKey.rules, `gsk_${'a'.repeat(52)}`)).toEqual(['starts with pplx-'])
    expect(failures(apiKey.rules, 'pplx-short')).toEqual(['at least 40 characters'])
  })
})
