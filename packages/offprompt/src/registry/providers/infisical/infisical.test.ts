import { describe, expect, it } from 'vitest'

import { failures } from '../../checks.js'
import { clientId } from './client-id.js'
import { clientSecret } from './client-secret.js'

const ID = '123e4567-e89b-12d3-a456-426614174000'

describe('Infisical machine identity', () => {
  it('accepts a client ID and a client secret', () => {
    expect(failures(clientId.rules, ID)).toEqual([])
    expect(failures(clientSecret.rules, 'a'.repeat(64))).toEqual([])
  })

  it('refuses the secret where the client ID goes', () => {
    expect(failures(clientId.rules, 'a'.repeat(64))).toEqual(['a UUID'])
  })

  it('refuses the client ID where the secret goes, and a secret cut short', () => {
    expect(failures(clientSecret.rules, ID)).toEqual(['at least 40 characters'])
    expect(failures(clientSecret.rules, 'a'.repeat(12))).toEqual(['at least 40 characters'])
  })

  it('shows the client ID in the clear, as Infisical calls it non-sensitive, and masks the secret', () => {
    expect(clientId.secret).toBe(false)
    expect(clientSecret.secret).toBeUndefined()
  })
})
