import type { Credential } from '../../schema.js'

export const domain: Credential = {
  id: 'domain',
  label: 'Domain',
  names: ['AUTH0_DOMAIN'],
  url: 'https://manage.auth0.com/#/applications',
  placeholder: 'example.us.auth0.com',
  secret: false,
  rules: [{ kind: 'format', format: 'hostname', message: 'a hostname, with no https:// or path' }],
  example: 'example.us.auth0.com',
}
