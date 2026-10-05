import { describe, expect, it } from 'vitest'

import { failures } from '../../checks.js'
import { accessToken } from './access-token.js'

describe('npm access token', () => {
  it('accepts a granular access token', () => {
    expect(failures(accessToken.rules, `npm_${'a'.repeat(36)}`)).toEqual([])
  })

  it('refuses a GitHub token, as GitHub Packages tokens go in the same .npmrc line', () => {
    expect(failures(accessToken.rules, `ghp_${'a'.repeat(36)}`)).toEqual(['starts with npm_'])
  })

  it('refuses a classic token, a UUID that npm revoked in December 2025', () => {
    expect(failures(accessToken.rules, '123e4567-e89b-12d3-a456-426614174000')).toEqual([
      'starts with npm_',
      'at least 40 characters',
    ])
  })

  it('refuses a token cut short', () => {
    expect(failures(accessToken.rules, 'npm_aaaa')).toEqual(['at least 40 characters'])
  })
})
