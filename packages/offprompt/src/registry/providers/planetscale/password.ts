import type { Credential } from '../../schema.js'

export const password: Credential = {
  id: 'password',
  label: 'Database password',
  names: ['PLANETSCALE_DB_PASSWORD', 'PLANETSCALE_PASSWORD'],
  url: 'https://app.planetscale.com',
  placeholder: 'pscale_pw_…',
  rules: [
    { kind: 'prefix', anyOf: ['pscale_pw_'], message: 'starts with pscale_pw_' },
    { kind: 'length', min: 30, max: 256, message: 'at least 30 characters' },
  ],
}
