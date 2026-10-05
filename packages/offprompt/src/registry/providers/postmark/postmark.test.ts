import { describe, expect, it } from 'vitest'

import { failures } from '../../checks.js'
import { serverToken } from './server-token.js'

const UUID = '123e4567-e89b-12d3-a456-426614174000'

describe('Postmark server API token', () => {
  it('accepts a UUID, in either case', () => {
    expect(failures(serverToken.rules, UUID)).toEqual([])
    expect(failures(serverToken.rules, UUID.toUpperCase())).toEqual([])
  })

  it('accepts the POSTMARK_API_TEST token Postmark documents for test sends', () => {
    expect(failures(serverToken.rules, 'POSTMARK_API_TEST')).toEqual([])
  })

  it('refuses another provider key and a UUID that is cut short', () => {
    const line = ['a UUID, or POSTMARK_API_TEST for test sends']
    expect(failures(serverToken.rules, `SG.${'a'.repeat(22)}.${'b'.repeat(43)}`)).toEqual(line)
    expect(failures(serverToken.rules, `re_${'a'.repeat(30)}`)).toEqual(line)
    expect(failures(serverToken.rules, UUID.slice(0, 30))).toEqual(line)
    expect(failures(serverToken.rules, '')).toEqual(line)
  })
})
