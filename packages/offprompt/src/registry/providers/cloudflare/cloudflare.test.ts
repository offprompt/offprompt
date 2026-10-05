import { describe, expect, it } from 'vitest'

import { failures } from '../../checks.js'
import { accountId } from './account-id.js'
import { apiToken } from './api-token.js'
import { r2AccessKeyId } from './r2-access-key-id.js'
import { r2SecretAccessKey } from './r2-secret-access-key.js'

const API_TOKEN_LINE = 'starts with cfut_ or cfat_, or is 40 characters'
const ID = '023e105f4ecef8ad9ca31a8372d0c353'

describe('Cloudflare API token', () => {
  it('accepts a cfut_ token, a cfat_ one, and an older one of 40 characters', () => {
    expect(failures(apiToken.rules, `cfut_${'a'.repeat(48)}`)).toEqual([])
    expect(failures(apiToken.rules, `cfat_${'a'.repeat(48)}`)).toEqual([])
    expect(failures(apiToken.rules, 'a'.repeat(40))).toEqual([])
  })

  it('refuses the global API key, an account ID, and another provider token', () => {
    expect(failures(apiToken.rules, `cfk_${'a'.repeat(48)}`)).toEqual([API_TOKEN_LINE])
    expect(failures(apiToken.rules, ID)).toEqual([API_TOKEN_LINE])
    expect(failures(apiToken.rules, `sk-${'a'.repeat(48)}`)).toEqual([API_TOKEN_LINE])
  })
})

describe('Cloudflare account ID', () => {
  it('accepts 32 hex digits and refuses a token, a name and a zone slug', () => {
    expect(failures(accountId.rules, ID)).toEqual([])
    expect(failures(accountId.rules, `cfut_${'a'.repeat(48)}`)).toEqual(['32 characters', 'hexadecimal characters only, 0-9 and a-f'])
    expect(failures(accountId.rules, 'my-account')).toEqual(['32 characters', 'hexadecimal characters only, 0-9 and a-f'])
  })
})

describe('Cloudflare R2 keys', () => {
  it('accepts an access key ID of 32 hex digits and a secret of 64', () => {
    expect(failures(r2AccessKeyId.rules, ID)).toEqual([])
    expect(failures(r2SecretAccessKey.rules, ID.repeat(2))).toEqual([])
  })

  it('refuses the key ID where the secret goes, and the secret where the ID goes', () => {
    expect(failures(r2SecretAccessKey.rules, ID)).toEqual(['64 characters'])
    expect(failures(r2AccessKeyId.rules, ID.repeat(2))).toEqual(['32 characters'])
  })
})
