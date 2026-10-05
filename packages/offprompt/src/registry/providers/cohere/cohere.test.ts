import { describe, expect, it } from 'vitest'

import { failures } from '../../checks.js'
import { apiKey } from './api-key.js'

describe('Cohere API key', () => {
  it('accepts a key of 40 characters', () => {
    expect(failures(apiKey.rules, 'a'.repeat(40))).toEqual([])
  })

  it('refuses a key cut short, and a whole pasted file', () => {
    expect(failures(apiKey.rules, 'a'.repeat(12))).toEqual(['30 to 128 characters'])
    expect(failures(apiKey.rules, `CO_API_KEY=${'a'.repeat(200)}`)).toEqual(['30 to 128 characters'])
  })
})
