import { describe, expect, it } from 'vitest'

import { failures } from '../../checks.js'
import { token } from './token.js'

const TOKEN = 'eyJhcGlLZXkiOiJza19saXZlX2V4YW1wbGUiLCJhcHBJZCI6ImV4YW1wbGVhcHAiLCJyZWdpb25zIjpbInNlYTEiXX0='

describe('UploadThing token', () => {
  it('accepts a token, the base64 of a JSON object with the key, app and regions', () => {
    expect(failures(token.rules, TOKEN)).toEqual([])
    expect(failures(token.rules, 'a'.repeat(100))).toEqual([])
  })

  it('refuses the legacy secret key, which is not base64, where the token goes', () => {
    expect(failures(token.rules, `sk_live_${'a'.repeat(64)}`)).toEqual(['base64 characters only'])
  })

  it('refuses a JWT, a URL and a value cut short', () => {
    const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJhIjoiYiJ9.c2lnbmF0dXJlLWV4YW1wbGU'
    expect(failures(token.rules, jwt)).toEqual(['base64 characters only'])
    expect(failures(token.rules, 'https://example.uploadthing.com/dashboard')).toEqual(['base64 characters only'])
    expect(failures(token.rules, 'eyJhcGlLZXki')).toEqual(['at least 40 characters'])
  })
})
