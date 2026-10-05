import type { Credential } from '../../schema.js'

export const clientId: Credential = {
  id: 'client_id',
  label: 'Client ID',
  names: ['INFISICAL_UNIVERSAL_AUTH_CLIENT_ID', 'INFISICAL_CLIENT_ID'],
  url: 'https://app.infisical.com',
  secret: false,
  rules: [{ kind: 'format', format: 'uuid', message: 'a UUID' }],
}
