import { describe, expect, it } from 'vitest'

import { failures } from '../../checks.js'
import { apiKey } from './api-key.js'
import { apiSecret } from './api-secret.js'
import { cloudName } from './cloud-name.js'
import { url } from './url.js'

const KEY = '123456789012345'

const SHAPE = 'the API key, a colon, the API secret, @ and the cloud name, with no <placeholders> left'
const SECRET = 'a'.repeat(27)

describe('Cloudinary API environment variable', () => {
  it('accepts the variable as the console shows it, with or without options after the cloud name', () => {
    expect(failures(url.rules, `cloudinary://${KEY}:${SECRET}@example-cloud`)).toEqual([])
    expect(
      failures(url.rules, `cloudinary://${KEY}:${SECRET}@example-cloud?secure_distribution=media.example.com`),
    ).toEqual([])
  })

  it('refuses the variable with the console placeholders still in it, or with a part missing', () => {
    expect(failures(url.rules, 'cloudinary://<your_api_key>:<your_api_secret>@example-cloud')).toEqual([SHAPE])
    expect(failures(url.rules, `cloudinary://${KEY}:${SECRET}`)).toEqual([SHAPE])
  })

  it('refuses another provider URL, and the bare scheme', () => {
    expect(failures(url.rules, 'postgresql://app:example@db.example.com:5432/app')).toEqual([
      'starts with cloudinary://',
      SHAPE,
    ])
    expect(failures(url.rules, 'cloudinary://')).toEqual(['at least 20 characters', SHAPE])
  })
})

describe('Cloudinary cloud name, API key and secret', () => {
  it('accepts each of them', () => {
    expect(failures(cloudName.rules, 'example-cloud')).toEqual([])
    expect(failures(apiKey.rules, KEY)).toEqual([])
    expect(failures(apiSecret.rules, SECRET)).toEqual([])
  })

  it('refuses the whole variable where the cloud name goes', () => {
    expect(failures(cloudName.rules, `cloudinary://${KEY}:${SECRET}@example-cloud`)).toEqual([
      'letters, numbers, - or _ only',
    ])
  })

  it('refuses the secret where the key goes, and a key where the secret goes', () => {
    expect(failures(apiKey.rules, SECRET)).toEqual(['8 to 24 characters', 'digits only'])
    expect(failures(apiSecret.rules, KEY)).toEqual(['20 to 64 characters'])
  })
})
