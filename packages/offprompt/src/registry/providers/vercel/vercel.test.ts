import { describe, expect, it } from 'vitest'

import { failures } from '../../checks.js'
import { accessToken } from './access-token.js'

describe('Vercel access token', () => {
  it('accepts a 24-character token', () => {
    expect(failures(accessToken.rules, 'a'.repeat(24))).toEqual([])
    expect(failures(accessToken.rules, 'short!')).toEqual(['24 characters', 'letters and numbers only'])
  })
})
