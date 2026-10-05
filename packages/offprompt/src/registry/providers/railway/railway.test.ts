import { describe, expect, it } from 'vitest'

import { failures } from '../../checks.js'
import { apiToken } from './api-token.js'
import { projectToken } from './project-token.js'

const UUID = '12345678-1234-4234-8234-123456789012'

describe('Railway tokens', () => {
  it('accepts a UUID as a project token and as an account token', () => {
    expect(failures(projectToken.rules, UUID)).toEqual([])
    expect(failures(apiToken.rules, UUID)).toEqual([])
  })

  it('refuses a value cut short, and an ID that is not long enough to be a token', () => {
    expect(failures(projectToken.rules, UUID.slice(0, 20))).toEqual(['at least 32 characters'])
    expect(failures(apiToken.rules, 'production')).toEqual(['at least 32 characters'])
  })
})
