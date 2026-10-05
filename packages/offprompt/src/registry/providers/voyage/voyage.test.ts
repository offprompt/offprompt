import { describe, expect, it } from 'vitest'

import { failures } from '../../checks.js'
import { apiKey } from './api-key.js'

describe('Voyage AI API key', () => {
  it('accepts a Voyage key and a MongoDB Atlas one', () => {
    expect(failures(apiKey.rules, `pa-${'a'.repeat(43)}`)).toEqual([])
    expect(failures(apiKey.rules, `al-${'a'.repeat(43)}`)).toEqual([])
  })

  it('refuses a Cohere-style key with no prefix and an OpenAI key, and reports a short one', () => {
    expect(failures(apiKey.rules, 'a'.repeat(40))).toEqual(['starts with pa- or al-'])
    expect(failures(apiKey.rules, `sk-proj-${'a'.repeat(50)}`)).toEqual(['starts with pa- or al-'])
    expect(failures(apiKey.rules, 'pa-short')).toEqual(['at least 20 characters'])
  })
})
