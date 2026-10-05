import type { Credential } from '../../schema.js'

export const authToken: Credential = {
  id: 'auth_token',
  label: 'Auth token',
  names: ['TURSO_AUTH_TOKEN'],
  url: 'https://app.turso.tech',
  placeholder: 'eyJ…',
  rules: [{ kind: 'format', format: 'jwt', message: 'a JWT, three base64url parts separated by dots' }],
}
