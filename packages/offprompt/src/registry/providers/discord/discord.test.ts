import { describe, expect, it } from 'vitest'

import { failures } from '../../checks.js'
import { applicationId } from './application-id.js'
import { botToken } from './bot-token.js'
import { publicKey } from './public-key.js'

// Three parts joined by dots: a base64 bot id, a timestamp, a signature.
const BOT_TOKEN = `${'A'.repeat(24)}.${'b'.repeat(6)}.${'c'.repeat(27)}`
const PUBLIC_KEY = 'a'.repeat(64)
const APPLICATION_ID = '1'.repeat(18)

describe('Discord bot token', () => {
  it('accepts a token of three parts, in the shorter and the longer shape', () => {
    expect(failures(botToken.rules, BOT_TOKEN)).toEqual([])
    expect(failures(botToken.rules, `${'A'.repeat(26)}.${'b'.repeat(6)}.${'c-_'.repeat(12)}`)).toEqual([])
  })

  it('refuses an application ID and a client secret, which are far shorter', () => {
    expect(failures(botToken.rules, APPLICATION_ID)).toEqual(['50 to 100 characters'])
    expect(failures(botToken.rules, 'a'.repeat(32))).toEqual(['50 to 100 characters'])
  })

  it('refuses a value that is cut short', () => {
    expect(failures(botToken.rules, BOT_TOKEN.slice(0, 30))).toEqual(['50 to 100 characters'])
  })
})

describe('Discord public key', () => {
  it('accepts 64 hexadecimal characters, in either case', () => {
    expect(failures(publicKey.rules, PUBLIC_KEY)).toEqual([])
    expect(failures(publicKey.rules, '0123456789ABCDEF'.repeat(4))).toEqual([])
  })

  it('refuses a bot token where the public key goes', () => {
    expect(failures(publicKey.rules, BOT_TOKEN)).toEqual(['64 characters', 'hexadecimal characters only, 0-9 and a-f'])
  })

  it('refuses a key that is cut short, or has another character in it', () => {
    expect(failures(publicKey.rules, PUBLIC_KEY.slice(0, 40))).toEqual(['64 characters'])
    expect(failures(publicKey.rules, `${'a'.repeat(63)}g`)).toEqual(['hexadecimal characters only, 0-9 and a-f'])
  })
})

describe('Discord application ID', () => {
  it('accepts 17 to 20 digits', () => {
    expect(failures(applicationId.rules, APPLICATION_ID)).toEqual([])
    expect(failures(applicationId.rules, '1'.repeat(17))).toEqual([])
    expect(failures(applicationId.rules, '1'.repeat(19))).toEqual([])
  })

  it('refuses a bot token and a public key where the application ID goes', () => {
    expect(failures(applicationId.rules, BOT_TOKEN)).toEqual(['17 to 20 digits', 'digits only'])
    expect(failures(applicationId.rules, PUBLIC_KEY)).toEqual(['17 to 20 digits', 'digits only'])
  })

  it('refuses an ID that is cut short', () => {
    expect(failures(applicationId.rules, '1'.repeat(10))).toEqual(['17 to 20 digits'])
  })
})
