import { describe, expect, it } from 'vitest'

import { failures } from '../../checks.js'
import { connectionString } from './connection-string.js'

const SCHEME = 'starts with mongodb+srv:// or mongodb://'

describe('MongoDB connection string', () => {
  it('accepts an Atlas string, and a standard one with several hosts', () => {
    expect(
      failures(
        connectionString.rules,
        'mongodb+srv://example_user:example_password@cluster0.example.mongodb.net/?retryWrites=true&w=majority',
      ),
    ).toEqual([])
    expect(
      failures(
        connectionString.rules,
        'mongodb://example_user:example_password@host1:27017,host2:27017/app?replicaSet=rs0',
      ),
    ).toEqual([])
    expect(failures(connectionString.rules, 'mongodb://localhost:27017/app')).toEqual([])
  })

  it('refuses another database URL, and a scheme with no host after it', () => {
    expect(failures(connectionString.rules, 'postgresql://app:example@db.example.com:5432/app')).toEqual([SCHEME])
    expect(failures(connectionString.rules, 'mongodb://')).toEqual(['at least 12 characters'])
  })

  it('refuses the string Atlas shows before the password is put in', () => {
    expect(
      failures(
        connectionString.rules,
        'mongodb+srv://example_user:<db_password>@cluster0.example.mongodb.net/?retryWrites=true&w=majority',
      ),
    ).toEqual(['no <db_password> placeholder left'])
    expect(
      failures(connectionString.rules, 'mongodb+srv://<db_username>:<db_password>@cluster0.example.mongodb.net/'),
    ).toEqual(['no <db_password> placeholder left'])
  })
})
