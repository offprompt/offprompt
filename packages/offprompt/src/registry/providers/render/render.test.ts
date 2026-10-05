import { describe, expect, it } from 'vitest'

import { failures } from '../../checks.js'
import { apiKey } from './api-key.js'

describe('Render API key', () => {
  it('accepts an rnd_ key', () => {
    expect(failures(apiKey.rules, `rnd_${'a'.repeat(32)}`)).toEqual([])
  })

  it('refuses another provider key, and says what a short one lacks', () => {
    expect(failures(apiKey.rules, `sk-${'a'.repeat(40)}`)).toEqual(['starts with rnd_'])
    expect(failures(apiKey.rules, `re_${'a'.repeat(32)}`)).toEqual(['starts with rnd_'])
    expect(failures(apiKey.rules, 'rnd_abc')).toEqual(['at least 20 characters'])
  })
})
