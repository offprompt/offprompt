import { describe, expect, it } from 'vitest'

import { failures } from '../../checks.js'
import { accessKeyId } from './access-key-id.js'
import { secretAccessKey } from './secret-access-key.js'
import { sessionToken } from './session-token.js'

const KEY_ID = 'AKIAIOSFODNN7EXAMPLE'
const SECRET = 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY'

describe('AWS access key ID', () => {
  it('accepts a long-term key and a temporary one', () => {
    expect(failures(accessKeyId.rules, KEY_ID)).toEqual([])
    expect(failures(accessKeyId.rules, 'ASIAIOSFODNN7EXAMPLE')).toEqual([])
  })

  it('refuses the secret key, an IAM user ID and a value cut short', () => {
    expect(failures(accessKeyId.rules, SECRET)).toEqual(['starts with AKIA or ASIA'])
    expect(failures(accessKeyId.rules, 'AIDAJQABLZS4A3QDU576Q')).toEqual(['starts with AKIA or ASIA'])
    expect(failures(accessKeyId.rules, 'AKIA1234')).toEqual(['16 to 128 characters'])
  })
})

describe('AWS secret access key', () => {
  it('accepts the documented example and refuses the access key ID in its place', () => {
    expect(failures(secretAccessKey.rules, SECRET)).toEqual([])
    expect(failures(secretAccessKey.rules, KEY_ID)).toEqual(['at least 40 characters'])
  })
})

describe('AWS session token', () => {
  it('accepts a long token and refuses a key pasted in its place', () => {
    expect(failures(sessionToken.rules, 'a'.repeat(300))).toEqual([])
    expect(failures(sessionToken.rules, SECRET)).toEqual(['at least 64 characters'])
    expect(failures(sessionToken.rules, KEY_ID)).toEqual(['at least 64 characters'])
  })
})
