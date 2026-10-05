import { describe, expect, it } from 'vitest'

import { failures } from '../../checks.js'
import { password } from './password.js'
import { serviceToken } from './service-token.js'
import { serviceTokenId } from './service-token-id.js'

const PASSWORD = `pscale_pw_${'a'.repeat(43)}`
const TOKEN = `pscale_tkn_${'a'.repeat(43)}`

describe('PlanetScale keys', () => {
  it('accepts a database password', () => {
    expect(failures(password.rules, PASSWORD)).toEqual([])
  })

  it('refuses a service token where the password goes, and a bare prefix', () => {
    expect(failures(password.rules, TOKEN)).toEqual(['starts with pscale_pw_'])
    expect(failures(password.rules, 'pscale_pw_')).toEqual(['at least 30 characters'])
  })

  it('accepts a service token and refuses a database password there', () => {
    expect(failures(serviceToken.rules, TOKEN)).toEqual([])
    expect(failures(serviceToken.rules, PASSWORD)).toEqual(['starts with pscale_tkn_'])
  })

  it('accepts a service token ID of any ordinary length and refuses one that is clearly not an ID', () => {
    expect(failures(serviceTokenId.rules, 'a'.repeat(12))).toEqual([])
    expect(failures(serviceTokenId.rules, 'abc')).toEqual(['6 to 64 characters'])
    expect(failures(serviceTokenId.rules, TOKEN.repeat(2))).toEqual(['6 to 64 characters'])
  })
})
