import type { Credential } from '../../schema.js'

export const apiKey: Credential = {
  id: 'api_key',
  label: 'API key',
  names: ['RESEND_API_KEY'],
  url: 'https://resend.com/api-keys',
  placeholder: 're_…',
  rules: [
    { kind: 'prefix', anyOf: ['re_'], message: 'starts with re_' },
    { kind: 'length', min: 20, max: 80, message: '20 to 80 characters' },
  ],
}
