import { describe, expect, it } from 'vitest'

import { failures } from '../../checks.js'
import { adminApiKey } from './admin-api-key.js'
import { applicationId } from './application-id.js'
import { searchApiKey } from './search-api-key.js'

const KEY = '0123456789abcdef0123456789abcdef'

const HEX = 'hexadecimal characters only, 0-9 and a-f'

describe('Algolia application ID', () => {
  it('accepts an ID of ten letters and digits', () => {
    expect(failures(applicationId.rules, 'ABCDEFGH12')).toEqual([])
  })

  it('refuses an API key pasted where the application ID goes', () => {
    expect(failures(applicationId.rules, KEY)).toEqual(['6 to 20 characters'])
  })

  it('refuses a value cut short', () => {
    expect(failures(applicationId.rules, 'ABC')).toEqual(['6 to 20 characters'])
  })
})

describe('Algolia API keys', () => {
  it.each([
    ['search-only', searchApiKey],
    ['admin', adminApiKey],
  ])('accepts a %s key of 32 hexadecimal characters', (_name, key) => {
    expect(failures(key.rules, KEY)).toEqual([])
    expect(failures(key.rules, KEY.toUpperCase())).toEqual([])
  })

  it.each([
    ['search-only', searchApiKey],
    ['admin', adminApiKey],
  ])('refuses an application ID and an OpenAI key in the %s key field', (_name, key) => {
    expect(failures(key.rules, 'ABCDEFGH12')).toEqual([HEX, '32 characters'])
    expect(failures(key.rules, `sk-proj-${'a'.repeat(40)}`)).toEqual([HEX, '32 characters'])
  })

  it('names each rule a bad value breaks, one line each', () => {
    expect(failures(adminApiKey.rules, 'g'.repeat(32))).toEqual([HEX])
    expect(failures(adminApiKey.rules, 'a'.repeat(31))).toEqual(['32 characters'])
  })
})
