import { describe, expect, it } from 'vitest'

import { failures } from '../../checks.js'
import { personalAccessToken } from './personal-access-token.js'
import { username } from './username.js'

const LINE = 'a dckr_pat_ token, or an older token that is a UUID'

describe('Docker Hub personal access token', () => {
  it('accepts a personal token, an organization token and an older token that is a UUID', () => {
    expect(failures(personalAccessToken.rules, `dckr_pat_${'a'.repeat(27)}`)).toEqual([])
    expect(failures(personalAccessToken.rules, `dckr_oat_${'a'.repeat(27)}`)).toEqual([])
    expect(failures(personalAccessToken.rules, '123e4567-e89b-12d3-a456-426614174000')).toEqual([])
  })

  it('refuses another provider token and an account password', () => {
    expect(failures(personalAccessToken.rules, `npm_${'a'.repeat(36)}`)).toEqual([LINE])
    expect(failures(personalAccessToken.rules, 'correct horse battery staple')).toEqual([LINE])
  })

  it('refuses a token cut short', () => {
    expect(failures(personalAccessToken.rules, 'dckr_pat_aaaa')).toEqual([LINE])
  })
})

describe('Docker Hub username', () => {
  it('accepts a Docker ID', () => {
    expect(failures(username.rules, 'moby')).toEqual([])
    expect(failures(username.rules, 'a'.repeat(30))).toEqual([])
  })

  it('refuses the token where the username goes, and an ID that is too short', () => {
    expect(failures(username.rules, `dckr_pat_${'a'.repeat(27)}`)).toEqual(['4 to 30 characters'])
    expect(failures(username.rules, 'abc')).toEqual(['4 to 30 characters'])
  })
})
