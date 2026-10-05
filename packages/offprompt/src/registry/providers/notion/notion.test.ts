import { describe, expect, it } from 'vitest'

import { failures } from '../../checks.js'
import { apiToken } from './api-token.js'

describe('Notion API token', () => {
  it('accepts an ntn_ token and an older secret_ one', () => {
    expect(failures(apiToken.rules, `ntn_${'a'.repeat(46)}`)).toEqual([])
    expect(failures(apiToken.rules, `secret_${'a'.repeat(43)}`)).toEqual([])
  })

  it('takes a token of another form, since Notion says the format may change', () => {
    expect(failures(apiToken.rules, 'a'.repeat(40))).toEqual([])
  })

  it('refuses a value too short to be a token', () => {
    expect(failures(apiToken.rules, 'secret')).toEqual(['at least 30 characters'])
    expect(failures(apiToken.rules, 'ntn_short')).toEqual(['at least 30 characters'])
  })
})
