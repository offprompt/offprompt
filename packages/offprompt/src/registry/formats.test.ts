import { describe, expect, it } from 'vitest'

import { failures } from './checks.js'
import { findFormat, type FormatId } from './formats.js'

const broken = (id: FormatId, value: string) => failures(findFormat(id).rules, value)

const JWT =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIn0.dBjftJeZ4CVPmB92K27uhbUJU1p1r_wW1gFWFOEjXk'

describe('formats', () => {
  it('accepts any text', () => {
    expect(broken('text', 'anything at all')).toEqual([])
  })

  it('accepts a whole number and refuses anything else', () => {
    expect(broken('integer', '3')).toEqual([])
    expect(broken('integer', '-12')).toEqual([])
    expect(broken('integer', '3.5')).toEqual(['a whole number'])
  })

  it('accepts a Postgres connection string from any provider', () => {
    expect(broken('postgres_url', 'postgresql://alex:pw@ep-cool-darkness-123456.us-east-2.aws.neon.tech/db?sslmode=require')).toEqual([])
    expect(broken('postgres_url', 'postgres://postgres.ref:pw@aws-0-us-east-1.pooler.supabase.com:6543/postgres')).toEqual([])
    expect(broken('postgres_url', 'mysql://root@localhost/db')).toEqual(['a postgres:// or postgresql:// URL with a host'])
    expect(broken('postgres_url', 'postgres://')).toHaveLength(1)
  })

  it('accepts hexadecimal and refuses anything else', () => {
    expect(broken('hex', 'deadbeef')).toEqual([])
    expect(broken('hex', 'deadbeeg')).toEqual(['hexadecimal characters only, 0-9 and a-f'])
    expect(broken('hex', 'abc')).toEqual(['at least 8 characters'])
  })

  it('accepts a padded base64 value', () => {
    expect(broken('base64', 'aGVsbG8gd29ybGQ=')).toEqual([])
    expect(broken('base64', 'not base64 !!')).toEqual(['base64, padded to a multiple of 4 characters'])
  })

  it('accepts an email address, an http URL and a UUID', () => {
    expect(broken('email', 'ada@example.com')).toEqual([])
    expect(broken('email', 'ada@')).toEqual(['an email address'])
    expect(broken('url', 'https://example.com/hook')).toEqual([])
    expect(broken('url', 'ftp://example.com')).toEqual(['a URL starting with http:// or https://'])
    expect(broken('uuid', '4b1c0cf0-7a3f-4c2a-9a4b-1d7d9f0a2e11')).toEqual([])
    expect(broken('uuid', 'not-a-uuid')).toHaveLength(1)
  })

  it('accepts a JWT, a PEM block and a JSON document', () => {
    expect(broken('jwt', JWT)).toEqual([])
    expect(broken('jwt', 'a.b.c')).toEqual(['a JWT, three base64url parts separated by dots'])
    expect(broken('pem', '-----BEGIN PRIVATE KEY-----\nMIIBabc\n-----END PRIVATE KEY-----')).toEqual([])
    expect(broken('pem', '-----BEGIN PRIVATE KEY-----\nMIIBabc')).toEqual(['a PEM block, with its BEGIN and END lines'])
    expect(broken('json', '{"type":"service_account"}')).toEqual([])
    expect(broken('json', '{type: broken}')).toEqual(['a valid JSON document'])
  })
})
