import type { Credential } from '../../schema.js'

export const clientId: Credential = {
  id: 'client_id',
  label: 'Client ID',
  names: ['AUTH0_CLIENT_ID'],
  url: 'https://manage.auth0.com/#/applications',
  secret: false,
  rules: [{ kind: 'length', min: 16, max: 64, message: '16 to 64 characters' }],
}
