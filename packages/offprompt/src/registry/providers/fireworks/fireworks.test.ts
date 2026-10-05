import { describe, expect, it } from 'vitest'

import { failures } from '../../checks.js'
import { apiKey } from './api-key.js'

describe('Fireworks AI API key', () => {
  it('accepts an account key and a Fire Pass key', () => {
    expect(failures(apiKey.rules, `fw_${'a'.repeat(40)}`)).toEqual([])
    expect(failures(apiKey.rules, `fpk_${'a'.repeat(40)}`)).toEqual([])
  })

  it('refuses a Replicate token and an OpenAI key, and reports a short key line by line', () => {
    expect(failures(apiKey.rules, `r8_${'a'.repeat(37)}`)).toEqual(['starts with fw_ or fpk_'])
    expect(failures(apiKey.rules, `sk-proj-${'a'.repeat(50)}`)).toEqual(['starts with fw_ or fpk_'])
    expect(failures(apiKey.rules, 'sk-short')).toEqual(['starts with fw_ or fpk_', 'at least 20 characters'])
    expect(failures(apiKey.rules, 'fw_short')).toEqual(['at least 20 characters'])
  })
})
