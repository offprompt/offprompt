import { describe, expect, it } from 'vitest'

import { failures } from '../../checks.js'
import { apiKey } from './api-key.js'

describe('Anthropic API key', () => {
  it('accepts an Anthropic key and refuses an OpenAI one', () => {
    expect(failures(apiKey.rules, `sk-ant-api03-${'a'.repeat(93)}AA`)).toEqual([])
    expect(failures(apiKey.rules, `sk-proj-${'a'.repeat(50)}`)).toEqual(['starts with sk-ant-api'])
  })

  it('refuses an OAuth token from a Claude subscription, which the API does not take as a key', () => {
    expect(failures(apiKey.rules, `sk-ant-oat01-${'a'.repeat(93)}AA`)).toEqual(['starts with sk-ant-api'])
  })
})
