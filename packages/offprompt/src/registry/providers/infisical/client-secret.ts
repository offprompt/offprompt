import type { Credential } from '../../schema.js'

export const clientSecret: Credential = {
  id: 'client_secret',
  label: 'Client secret',
  names: ['INFISICAL_UNIVERSAL_AUTH_CLIENT_SECRET', 'INFISICAL_CLIENT_SECRET'],
  url: 'https://app.infisical.com',
  rules: [{ kind: 'length', min: 40, max: 256, message: 'at least 40 characters' }],
}
