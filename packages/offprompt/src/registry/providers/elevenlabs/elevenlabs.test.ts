import { describe, expect, it } from 'vitest'

import { failures } from '../../checks.js'
import { apiKey } from './api-key.js'

describe('ElevenLabs API key', () => {
  it('accepts a key of 48 or 32 characters after sk_', () => {
    expect(failures(apiKey.rules, `sk_${'a'.repeat(48)}`)).toEqual([])
    expect(failures(apiKey.rules, `sk_${'a'.repeat(32)}`)).toEqual([])
  })

  it('refuses an OpenAI key pasted by mistake, and reports a short one', () => {
    expect(failures(apiKey.rules, `sk-proj-${'a'.repeat(50)}`)).toEqual(['starts with sk_'])
    expect(failures(apiKey.rules, 'sk_short')).toEqual(['at least 20 characters'])
    expect(failures(apiKey.rules, 'short')).toEqual(['starts with sk_', 'at least 20 characters'])
  })
})
