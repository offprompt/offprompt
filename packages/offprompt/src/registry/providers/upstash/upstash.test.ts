import { describe, expect, it } from 'vitest'

import { failures } from '../../checks.js'
import { qstashCurrentSigningKey } from './qstash-current-signing-key.js'
import { qstashNextSigningKey } from './qstash-next-signing-key.js'
import { qstashToken } from './qstash-token.js'
import { redisRestToken } from './redis-rest-token.js'
import { redisRestUrl } from './redis-rest-url.js'

const REDIS_TOKEN = `AX${'a'.repeat(58)}=`
const QSTASH_TOKEN = 'eyJVc2VySUQiOiJleGFtcGxlLXVzZXIiLCJQYXNzd29yZCI6ImV4YW1wbGUtcGFzc3dvcmQifQ=='
const SIGNING_KEY = `sig_${'a'.repeat(32)}`

describe('Upstash Redis REST URL', () => {
  it('accepts the hosted endpoint, and a local proxy over http', () => {
    expect(failures(redisRestUrl.rules, 'https://example-db-12345.upstash.io')).toEqual([])
    expect(failures(redisRestUrl.rules, 'http://localhost:8079')).toEqual([])
  })

  it('refuses the TCP URL the same console page shows, and the token where the URL goes', () => {
    const tcp = `rediss://default:${'a'.repeat(30)}@example-db-12345.upstash.io:6379`
    expect(failures(redisRestUrl.rules, tcp)).toEqual(['a URL starting with http:// or https://'])
    expect(failures(redisRestUrl.rules, REDIS_TOKEN)).toEqual(['a URL starting with http:// or https://'])
  })
})

describe('Upstash Redis REST token', () => {
  it('accepts a token', () => {
    expect(failures(redisRestToken.rules, REDIS_TOKEN)).toEqual([])
  })

  it('refuses a value too short to be one, such as a database name', () => {
    expect(failures(redisRestToken.rules, 'example-db-12345')).toEqual(['at least 20 characters'])
  })
})

describe('Upstash QStash keys', () => {
  it('accepts a token, and refuses one cut short', () => {
    expect(failures(qstashToken.rules, QSTASH_TOKEN)).toEqual([])
    expect(failures(qstashToken.rules, 'eyJVc2VySUQi')).toEqual(['at least 20 characters'])
  })

  it('accepts a signing key in either place', () => {
    expect(failures(qstashCurrentSigningKey.rules, SIGNING_KEY)).toEqual([])
    expect(failures(qstashNextSigningKey.rules, SIGNING_KEY)).toEqual([])
  })

  it('refuses the token, and a Redis token, where a signing key goes', () => {
    expect(failures(qstashCurrentSigningKey.rules, QSTASH_TOKEN)).toEqual(['starts with sig_'])
    expect(failures(qstashNextSigningKey.rules, REDIS_TOKEN)).toEqual(['starts with sig_'])
  })
})
