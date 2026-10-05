import { describe, expect, it } from 'vitest'

import { failures } from '../../checks.js'
import { personalAccessToken } from './personal-access-token.js'

describe('GitLab personal access token', () => {
  it('accepts a glpat- token, a routable one, one with an instance prefix and one with none', () => {
    expect(failures(personalAccessToken.rules, `glpat-${'a'.repeat(20)}`)).toEqual([])
    expect(failures(personalAccessToken.rules, `glpat-${'a'.repeat(40)}.01abcdefg`)).toEqual([])
    expect(failures(personalAccessToken.rules, `acme-glpat-${'a'.repeat(20)}`)).toEqual([])
    expect(failures(personalAccessToken.rules, 'a'.repeat(20))).toEqual([])
  })

  it('refuses a value cut short, under one line', () => {
    expect(failures(personalAccessToken.rules, `glpat-${'a'.repeat(8)}`)).toEqual(['at least 20 characters'])
    expect(failures(personalAccessToken.rules, '')).toEqual(['at least 20 characters'])
  })
})
