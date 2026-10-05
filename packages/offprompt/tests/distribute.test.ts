import { describe, expect, it } from 'vitest'

import { distribute } from '../src/web/client/distribute.js'

const names = ['API_SECRET_A', 'API_SECRET_B']

const fillsOf = (text: string, asked: readonly string[] = names) =>
  Object.fromEntries(distribute({ text, names: asked })?.fills ?? [])

describe('distributing a paste across the fields', () => {
  it('fills each field from the line naming its key', () => {
    expect(fillsOf('API_SECRET_A=some_secret_a\nAPI_SECRET_B="some secret with b and spaces"')).toEqual({
      API_SECRET_A: 'some_secret_a',
      API_SECRET_B: 'some secret with b and spaces',
    })
  })

  it('takes the lines in any order', () => {
    expect(fillsOf('API_SECRET_B=bee\nAPI_SECRET_A=ay')).toEqual({ API_SECRET_A: 'ay', API_SECRET_B: 'bee' })
  })

  it('reads the export prefix, single quotes and comments a dashboard copy carries', () => {
    expect(fillsOf("# from the dashboard\nexport API_SECRET_A='ay #1'\n\nAPI_SECRET_B=bee")).toEqual({
      API_SECRET_A: 'ay #1',
      API_SECRET_B: 'bee',
    })
  })

  it('reads a quoted value that runs over several lines', () => {
    const pem = '-----BEGIN PRIVATE KEY-----\nMIIBabc\n-----END PRIVATE KEY-----'
    expect(fillsOf(`SIGNING_KEY="${pem}"`, ['SIGNING_KEY'])).toEqual({ SIGNING_KEY: pem })
  })

  it('fills only the keys the paste names, leaving the rest', () => {
    expect(fillsOf('API_SECRET_A=ay')).toEqual({ API_SECRET_A: 'ay' })
  })

  it('lists the keys it was given but not asked for, by name', () => {
    const result = distribute({ text: 'API_SECRET_A=ay\nUNRELATED=x\nOTHER=y\nUNRELATED=z', names })
    expect(result?.ignored).toEqual(['UNRELATED', 'OTHER'])
  })

  it('takes the last value when a key appears twice, as a dotenv reader does', () => {
    expect(fillsOf('API_SECRET_A=first\nAPI_SECRET_A=second')).toEqual({ API_SECRET_A: 'second' })
  })

  it('does not fill a field from an empty assignment', () => {
    expect(fillsOf('API_SECRET_A=\nAPI_SECRET_B=bee')).toEqual({ API_SECRET_B: 'bee' })
  })
})

describe('leaving an ordinary paste alone', () => {
  const ordinary = [
    ['a bare key', 're_abcdef0123456789abcdef'],
    ['base64 ending in padding', 'dGhpcyBpcyBhIHNlY3JldA=='],
    ['a connection string', 'postgres://user:p4ss@host:5432/db?sslmode=require'],
    ['an assignment to a key this page did not ask for', 'SOMETHING_ELSE=value'],
    ['a PEM block', '-----BEGIN PRIVATE KEY-----\nMIIBabc\n-----END PRIVATE KEY-----'],
    ['nothing at all', ''],
  ] as const

  it.each(ordinary)('does not treat %s as a batch', (_label, text) => {
    expect(distribute({ text, names })).toBeUndefined()
  })
})
