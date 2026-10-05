import { describe, expect, it } from 'vitest'

import { failures } from '../../checks.js'
import { accessToken } from './access-token.js'

describe('Fly.io access token', () => {
  it('accepts every form flyctl reads, with or without FlyV1, one token or several', () => {
    expect(failures(accessToken.rules, `FlyV1 fm2_${'a'.repeat(120)}`)).toEqual([])
    expect(failures(accessToken.rules, `fm2_${'a'.repeat(120)}`)).toEqual([])
    expect(failures(accessToken.rules, `FlyV1 fm2_${'a'.repeat(120)},fm2_${'b'.repeat(120)}`)).toEqual([])
    expect(failures(accessToken.rules, `fm1r_${'a'.repeat(120)}`)).toEqual([])
    expect(failures(accessToken.rules, `fo1_${'a'.repeat(43)}`)).toEqual([])
    expect(failures(accessToken.rules, `fm3_${'a'.repeat(120)}`)).toEqual([])
  })

  it('refuses a value cut short, under one line', () => {
    expect(failures(accessToken.rules, 'FlyV1 fm2_abc')).toEqual(['at least 40 characters'])
    expect(failures(accessToken.rules, 'app-name')).toEqual(['at least 40 characters'])
  })
})
