import { describe, expect, it } from 'vitest'

import { failures } from '../../checks.js'
import { apiKey } from './api-key.js'
import { applicationKey } from './application-key.js'

const API_KEY = '0123456789abcdef0123456789abcdef'

const APP_KEY = '0123456789abcdef0123456789abcdef01234567'

const APPLICATION = '40 hexadecimal characters, or a 40-character ddapp_ key'

describe('Datadog API key', () => {
  it('accepts 32 hexadecimal characters', () => {
    expect(failures(apiKey.rules, API_KEY)).toEqual([])
    expect(failures(apiKey.rules, API_KEY.toUpperCase())).toEqual([])
  })

  it('names each rule a bad value breaks, one line each', () => {
    expect(failures(apiKey.rules, 'g'.repeat(32))).toEqual(['hexadecimal characters only, 0-9 and a-f'])
    expect(failures(apiKey.rules, 'a'.repeat(31))).toEqual(['32 characters'])
    expect(failures(apiKey.rules, 'not-a-key')).toEqual(['hexadecimal characters only, 0-9 and a-f', '32 characters'])
  })

  it('refuses the application key, which is longer, where the API key goes', () => {
    expect(failures(apiKey.rules, APP_KEY)).toEqual(['32 characters'])
  })
})

describe('Datadog application key', () => {
  it('accepts 40 hexadecimal characters, and a ddapp_ key', () => {
    expect(failures(applicationKey.rules, APP_KEY)).toEqual([])
    expect(failures(applicationKey.rules, `ddapp_${'aB3'.repeat(11)}a`)).toEqual([])
  })

  it('refuses the API key, which is shorter, where the application key goes', () => {
    expect(failures(applicationKey.rules, API_KEY)).toEqual([APPLICATION])
  })

  it('refuses a Sentry token and a ddapp_ key cut short', () => {
    expect(failures(applicationKey.rules, `sntryu_${'a'.repeat(64)}`)).toEqual([APPLICATION])
    expect(failures(applicationKey.rules, 'ddapp_short')).toEqual([APPLICATION])
  })
})
