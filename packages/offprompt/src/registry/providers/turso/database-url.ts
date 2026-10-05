import type { Credential } from '../../schema.js'

export const databaseUrl: Credential = {
  id: 'database_url',
  label: 'Database URL',
  names: ['TURSO_DATABASE_URL'],
  url: 'https://app.turso.tech',
  placeholder: 'libsql://…',
  secret: false,
  rules: [
    {
      kind: 'either',
      options: [
        [{ kind: 'prefix', anyOf: ['libsql://', 'wss://', 'ws://'], message: 'starts with libsql://' }],
        [{ kind: 'format', format: 'url', message: 'an https:// URL' }],
      ],
      message: 'a libsql:// or https:// URL',
    },
    { kind: 'length', min: 12, max: 2048, message: 'at least 12 characters' },
  ],
}
