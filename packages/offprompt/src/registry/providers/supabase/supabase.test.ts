import { describe, expect, it } from 'vitest'

import { failures } from '../../checks.js'
import { publishableKey } from './publishable-key.js'
import { secretKey } from './secret-key.js'

const JWT =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIn0.dBjftJeZ4CVPmB92K27uhbUJU1p1r_wW1gFWFOEjXk'

describe('Supabase keys', () => {
  it('accepts either shape of secret key, under one line', () => {
    expect(failures(secretKey.rules, `sb_secret_${'a'.repeat(30)}`)).toEqual([])
    expect(failures(secretKey.rules, JWT)).toEqual([])
    expect(failures(secretKey.rules, 'plain-text')).toEqual(['an sb_secret_ key, or the legacy service_role JWT'])
  })

  it('accepts either shape of publishable key', () => {
    expect(failures(publishableKey.rules, `sb_publishable_${'a'.repeat(30)}`)).toEqual([])
    expect(failures(publishableKey.rules, JWT)).toEqual([])
  })
})
