import { describe, expect, it } from 'vitest'

import { failures } from '../../checks.js'
import { apiKey } from './api-key.js'

describe('Resend API key', () => {
  it('accepts a key and reports every rule a bad one breaks, one line each', () => {
    expect(failures(apiKey.rules, `re_${'a'.repeat(30)}`)).toEqual([])
    expect(failures(apiKey.rules, 'sk_short')).toEqual(['starts with re_', '20 to 80 characters'])
    expect(failures(apiKey.rules, 're_short')).toEqual(['20 to 80 characters'])
  })
})
