import type { Credential } from '../../schema.js'

export const sendingDomain: Credential = {
  id: 'sending_domain',
  label: 'Sending domain',
  names: ['MAILGUN_DOMAIN'],
  url: 'https://app.mailgun.com/mg/sending/domains',
  placeholder: 'mg.example.com',
  secret: false,
  rules: [
    { kind: 'length', min: 4, max: 253, message: '4 to 253 characters' },
    {
      kind: 'charset',
      pattern: '^[A-Za-z0-9-]+(\\.[A-Za-z0-9-]+)+$',
      message: 'a domain such as mg.example.com, with no https:// or @',
    },
  ],
  example: 'mg.example.com',
}
