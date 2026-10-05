import { describe, expect, it } from 'vitest'

import { failures } from '../../checks.js'
import { personalAccessToken } from './personal-access-token.js'

describe('GitHub personal access token', () => {
  it('accepts both token shapes', () => {
    expect(failures(personalAccessToken.rules, `ghp_${'a'.repeat(36)}`)).toEqual([])
    expect(failures(personalAccessToken.rules, `github_pat_${'a'.repeat(60)}`)).toEqual([])
    expect(failures(personalAccessToken.rules, `re_${'a'.repeat(40)}`)).toContain('starts with ghp_ or github_pat_')
  })
})
