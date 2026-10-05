import { describe, expect, it } from 'vitest'

import { failures } from '../../checks.js'
import { apiKey } from './api-key.js'

describe('Groq API key', () => {
  it('accepts a key', () => {
    expect(failures(apiKey.rules, `gsk_${'a'.repeat(52)}`)).toEqual([])
  })

  it('refuses a key from another provider and a truncated one, one line each', () => {
    expect(failures(apiKey.rules, `xai-${'a'.repeat(80)}`)).toEqual(['starts with gsk_'])
    expect(failures(apiKey.rules, `sk-${'a'.repeat(48)}`)).toEqual(['starts with gsk_'])
    expect(failures(apiKey.rules, 'gsk_short')).toEqual(['at least 40 characters'])
    expect(failures(apiKey.rules, 'short')).toEqual(['starts with gsk_', 'at least 40 characters'])
  })
})
