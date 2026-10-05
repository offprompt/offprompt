import { describe, expect, it } from 'vitest'

import { failures } from '../../checks.js'
import { accountSid } from './account-sid.js'
import { apiKeySecret } from './api-key-secret.js'
import { apiKeySid } from './api-key-sid.js'
import { authToken } from './auth-token.js'

const ACCOUNT_SID = `AC${'a'.repeat(32)}`
const API_KEY_SID = `SK${'b'.repeat(32)}`
const TOKEN = 'c'.repeat(32)

describe('Twilio Account SID', () => {
  it('accepts AC and 32 hexadecimal characters, in either case', () => {
    expect(failures(accountSid.rules, ACCOUNT_SID)).toEqual([])
    expect(failures(accountSid.rules, `AC${'0123456789ABCDEF'.repeat(2)}`)).toEqual([])
  })

  it('refuses an API key SID where the account SID goes', () => {
    expect(failures(accountSid.rules, API_KEY_SID)).toEqual([
      'starts with AC',
      'hexadecimal characters after AC, 0-9 and a-f',
    ])
  })

  it('refuses the auth token where the account SID goes', () => {
    expect(failures(accountSid.rules, TOKEN)).toEqual(['starts with AC', '34 characters', 'hexadecimal characters after AC, 0-9 and a-f'])
  })

  it('refuses a SID that is cut short, or has another character in it', () => {
    expect(failures(accountSid.rules, ACCOUNT_SID.slice(0, 20))).toEqual(['34 characters'])
    expect(failures(accountSid.rules, `AC${'g'.repeat(32)}`)).toEqual(['hexadecimal characters after AC, 0-9 and a-f'])
  })
})

describe('Twilio auth token', () => {
  it('accepts 32 characters', () => {
    expect(failures(authToken.rules, TOKEN)).toEqual([])
  })

  it('refuses the account SID where the token goes', () => {
    expect(failures(authToken.rules, ACCOUNT_SID)).toEqual(['32 characters'])
  })

  it('refuses a token that is cut short', () => {
    expect(failures(authToken.rules, TOKEN.slice(0, 31))).toEqual(['32 characters'])
  })
})

describe('Twilio API key', () => {
  it('accepts SK and 32 hexadecimal characters for the SID, and 32 characters for the secret', () => {
    expect(failures(apiKeySid.rules, API_KEY_SID)).toEqual([])
    expect(failures(apiKeySecret.rules, 'Ab1Cd2Ef3Gh4'.repeat(3).slice(0, 32))).toEqual([])
  })

  it('refuses an account SID where the API key SID goes', () => {
    expect(failures(apiKeySid.rules, ACCOUNT_SID)).toEqual(['starts with SK', 'hexadecimal characters after SK, 0-9 and a-f'])
  })

  it('refuses an account SID where the secret goes', () => {
    expect(failures(apiKeySecret.rules, ACCOUNT_SID)).toEqual(['32 characters'])
  })
})
