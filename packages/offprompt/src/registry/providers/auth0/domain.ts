import type { Credential } from '../../schema.js'

export const domain: Credential = {
  id: 'domain',
  label: 'Domain',
  names: ['AUTH0_DOMAIN'],
  url: 'https://manage.auth0.com/#/applications',
  placeholder: 'example.us.auth0.com',
  secret: false,
  rules: [
    {
      kind: 'charset',
      pattern: '^[A-Za-z0-9-]+(\\.[A-Za-z0-9-]+)+$',
      message: 'a hostname such as example.us.auth0.com, without https://',
    },
  ],
  example: 'example.us.auth0.com',
}
