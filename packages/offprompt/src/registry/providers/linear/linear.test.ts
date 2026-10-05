import { describe, expect, it } from 'vitest'

import { failures } from '../../checks.js'
import { apiKey } from './api-key.js'

describe('Linear personal API key', () => {
  it('accepts a key', () => {
    expect(failures(apiKey.rules, `lin_api_${'a'.repeat(40)}`)).toEqual([])
  })

  it('refuses an OAuth token and a GitHub token pasted where the API key goes', () => {
    expect(failures(apiKey.rules, `lin_oauth_${'a'.repeat(40)}`)).toEqual(['starts with lin_api_'])
    expect(failures(apiKey.rules, `ghp_${'a'.repeat(36)}`)).toEqual(['starts with lin_api_'])
  })

  it('reports every rule a bad value breaks, one line each', () => {
    expect(failures(apiKey.rules, 'secret')).toEqual(['starts with lin_api_', 'at least 30 characters'])
    expect(failures(apiKey.rules, 'lin_api_short')).toEqual(['at least 30 characters'])
  })
})
