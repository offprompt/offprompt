import type { Credential } from '../../schema.js'

export const clientId: Credential = {
  id: 'client_id',
  label: 'Client ID',
  names: ['WORKOS_CLIENT_ID'],
  url: 'https://dashboard.workos.com/api-keys',
  placeholder: 'client_…',
  secret: false,
  rules: [
    { kind: 'prefix', anyOf: ['client_'], message: 'starts with client_' },
    { kind: 'length', min: 10, max: 80, message: '10 to 80 characters' },
  ],
}
