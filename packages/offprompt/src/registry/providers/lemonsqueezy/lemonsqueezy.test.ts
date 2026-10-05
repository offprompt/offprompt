import { describe, expect, it } from 'vitest'

import { failures } from '../../checks.js'
import { apiKey } from './api-key.js'

const HEADER = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9'
const KEY = [HEADER, 'a'.repeat(300), 'b'.repeat(500)].join('.')

describe('Lemon Squeezy API key', () => {
  it('accepts the long JWT the dashboard shows', () => {
    expect(failures(apiKey.rules, KEY)).toEqual([])
  })

  it('refuses a key from another provider', () => {
    expect(failures(apiKey.rules, `sk_live_${'a'.repeat(40)}`)).toEqual(['a JWT, which starts with eyJ'])
  })

  it('refuses a key cut short when it was copied', () => {
    expect(failures(apiKey.rules, `${HEADER}.${'a'.repeat(300)}`)).toEqual(['a JWT, which starts with eyJ'])
  })
})
