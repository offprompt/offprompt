import { describe, expect, it } from 'vitest'

import { failures } from '../../checks.js'
import { serviceAccountToken } from './service-account-token.js'

describe('1Password service account token', () => {
  it('accepts an ops_ token, which is long because it carries a serialised key set', () => {
    expect(failures(serviceAccountToken.rules, `ops_eyJ${'a'.repeat(800)}`)).toEqual([])
    expect(failures(serviceAccountToken.rules, `ops_${'a'.repeat(200)}`)).toEqual([])
  })

  it('refuses a Connect server token, which is a JWT and has no ops_ prefix', () => {
    expect(failures(serviceAccountToken.rules, `eyJ${'a'.repeat(800)}`)).toEqual(['starts with ops_'])
  })

  it('refuses a Secret Key and a token cut short', () => {
    expect(failures(serviceAccountToken.rules, 'A3-AAAAAA-AAAAAAAAAAA-AAAAA-AAAAA-AAAAA')).toEqual([
      'starts with ops_',
      'at least 200 characters',
    ])
    expect(failures(serviceAccountToken.rules, `ops_eyJ${'a'.repeat(20)}`)).toEqual(['at least 200 characters'])
  })
})
