import type { Credential } from '../../schema.js'

export const sendingDomain: Credential = {
  id: 'sending_domain',
  label: 'Sending domain',
  names: ['MAILGUN_DOMAIN'],
  url: 'https://app.mailgun.com/mg/sending/domains',
  placeholder: 'mg.example.com',
  secret: false,
  rules: [{ kind: 'format', format: 'hostname', message: 'a hostname, with no https:// or path' }],
  example: 'mg.example.com',
}
