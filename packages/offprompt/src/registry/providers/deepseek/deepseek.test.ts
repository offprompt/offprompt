import { describe, expect, it } from 'vitest'

import { failures } from '../../checks.js'
import { apiKey } from './api-key.js'

describe('DeepSeek API key', () => {
  it('accepts a key', () => {
    expect(failures(apiKey.rules, `sk-${'a'.repeat(32)}`)).toEqual([])
  })

  it('refuses a key from a provider with another prefix', () => {
    expect(failures(apiKey.rules, `gsk_${'a'.repeat(52)}`)).toEqual(['starts with sk-'])
    expect(failures(apiKey.rules, `pplx-${'a'.repeat(48)}`)).toEqual(['starts with sk-'])
  })

  it('refuses the long keys of OpenAI and Anthropic, which share the sk- prefix, by their length', () => {
    expect(failures(apiKey.rules, `sk-proj-${'a'.repeat(150)}`)).toEqual(['30 to 100 characters'])
    expect(failures(apiKey.rules, `sk-ant-api03-${'a'.repeat(95)}`)).toEqual(['30 to 100 characters'])
    expect(failures(apiKey.rules, 'sk-short')).toEqual(['30 to 100 characters'])
  })
})
