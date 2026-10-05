import { describe, expect, it } from 'vitest'

import { failures } from '../../checks.js'
import { apiKey } from './api-key.js'

describe('Gemini API key', () => {
  it('accepts the AQ. keys AI Studio issues now and the AIza keys it issued before', () => {
    expect(failures(apiKey.rules, `AQ.${'a'.repeat(50)}`)).toEqual([])
    expect(failures(apiKey.rules, `AIza${'a'.repeat(35)}`)).toEqual([])
  })

  it('refuses a key from another provider and a truncated one', () => {
    expect(failures(apiKey.rules, `gsk_${'a'.repeat(52)}`)).toEqual(['starts with AQ. or AIza'])
    expect(failures(apiKey.rules, `sk-proj-${'a'.repeat(50)}`)).toEqual(['starts with AQ. or AIza'])
    expect(failures(apiKey.rules, 'AIza_short')).toEqual(['at least 30 characters'])
  })
})
