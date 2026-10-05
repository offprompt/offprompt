import { describe, expect, it } from 'vitest'

import { failures } from '../../checks.js'
import { apiKey } from './api-key.js'

describe('xAI API key', () => {
  it('accepts a key', () => {
    expect(failures(apiKey.rules, `xai-${'a'.repeat(80)}`)).toEqual([])
  })

  it('refuses a Groq key, and one cut short', () => {
    expect(failures(apiKey.rules, `gsk_${'a'.repeat(52)}`)).toEqual(['starts with xai-'])
    expect(failures(apiKey.rules, 'xai-short')).toEqual(['at least 40 characters'])
  })
})
