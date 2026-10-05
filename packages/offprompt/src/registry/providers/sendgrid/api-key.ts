import type { Credential } from '../../schema.js'

export const apiKey: Credential = {
  id: 'api_key',
  label: 'API key',
  names: ['SENDGRID_API_KEY'],
  url: 'https://app.sendgrid.com/settings/api_keys',
  placeholder: 'SG.…',
  rules: [
    { kind: 'prefix', anyOf: ['SG.'], message: 'starts with SG.' },
    { kind: 'length', min: 50, max: 256, message: 'at least 50 characters' },
  ],
}
