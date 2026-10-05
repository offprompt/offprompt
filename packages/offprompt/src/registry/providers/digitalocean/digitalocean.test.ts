import { describe, expect, it } from 'vitest'

import { failures } from '../../checks.js'
import { personalAccessToken } from './personal-access-token.js'
import { spacesAccessKeyId } from './spaces-access-key-id.js'
import { spacesSecretAccessKey } from './spaces-secret-access-key.js'

describe('DigitalOcean personal access token', () => {
  it('accepts a dop_v1_ token, an OAuth one, and an older one with no prefix', () => {
    expect(failures(personalAccessToken.rules, `dop_v1_${'a'.repeat(64)}`)).toEqual([])
    expect(failures(personalAccessToken.rules, `doo_v1_${'a'.repeat(64)}`)).toEqual([])
    expect(failures(personalAccessToken.rules, 'a'.repeat(64))).toEqual([])
  })

  it('refuses a value cut short, under one line', () => {
    expect(failures(personalAccessToken.rules, `dop_v1_${'a'.repeat(12)}`)).toEqual(['at least 40 characters'])
    expect(failures(personalAccessToken.rules, 'droplet-1')).toEqual(['at least 40 characters'])
  })
})

describe('DigitalOcean Spaces keys', () => {
  it('accepts an access key and a secret key', () => {
    expect(failures(spacesAccessKeyId.rules, `DO00${'A'.repeat(16)}`)).toEqual([])
    expect(failures(spacesSecretAccessKey.rules, 'a'.repeat(43))).toEqual([])
  })

  it('refuses the access key where the secret goes, and a name where the access key goes', () => {
    expect(failures(spacesSecretAccessKey.rules, `DO00${'A'.repeat(16)}`)).toEqual(['at least 32 characters'])
    expect(failures(spacesAccessKeyId.rules, 'my-space')).toEqual(['16 to 128 characters'])
  })
})
