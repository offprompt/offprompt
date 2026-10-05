import { describe, expect, it } from 'vitest'

import { failures } from '../../checks.js'
import { apiKey } from './api-key.js'

describe('OpenRouter API key', () => {
  it('accepts a v1 key, and a later version of the prefix', () => {
    expect(failures(apiKey.rules, `sk-or-v1-${'a'.repeat(64)}`)).toEqual([])
    expect(failures(apiKey.rules, `sk-or-v2-${'a'.repeat(64)}`)).toEqual([])
  })

  it('refuses an OpenAI or an Anthropic key, and a truncated one', () => {
    expect(failures(apiKey.rules, `sk-proj-${'a'.repeat(150)}`)).toEqual(['starts with sk-or-'])
    expect(failures(apiKey.rules, `sk-ant-api03-${'a'.repeat(90)}`)).toEqual(['starts with sk-or-'])
    expect(failures(apiKey.rules, 'sk-or-v1-short')).toEqual(['at least 40 characters'])
  })
})
