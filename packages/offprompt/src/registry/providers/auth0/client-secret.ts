import type { Credential } from '../../schema.js'

export const clientSecret: Credential = {
  id: 'client_secret',
  label: 'Client secret',
  names: ['AUTH0_CLIENT_SECRET'],
  url: 'https://manage.auth0.com/#/applications',
  rules: [{ kind: 'length', min: 16, max: 256, message: 'at least 16 characters' }],
}
