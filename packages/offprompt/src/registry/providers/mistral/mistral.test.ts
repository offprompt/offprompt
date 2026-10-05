import { describe, expect, it } from 'vitest'

import { failures } from '../../checks.js'
import { apiKey } from './api-key.js'

describe('Mistral API key', () => {
  it('accepts a key of any shape within a wide length range, since Mistral gives its keys no prefix', () => {
    expect(failures(apiKey.rules, 'a'.repeat(32))).toEqual([])
    expect(failures(apiKey.rules, `ms-${'a'.repeat(60)}`)).toEqual([])
  })

  it('refuses a value too short to be a key and one far too long', () => {
    expect(failures(apiKey.rules, 'a'.repeat(10))).toEqual(['20 to 128 characters'])
    expect(failures(apiKey.rules, `sk-proj-${'a'.repeat(156)}`)).toEqual(['20 to 128 characters'])
  })
})
