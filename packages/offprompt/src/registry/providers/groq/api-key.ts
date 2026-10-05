import type { Credential } from '../../schema.js'

export const apiKey: Credential = {
  id: 'api_key',
  label: 'API key',
  names: ['GROQ_API_KEY'],
  url: 'https://console.groq.com/keys',
  placeholder: 'gsk_…',
  rules: [
    { kind: 'prefix', anyOf: ['gsk_'], message: 'starts with gsk_' },
    { kind: 'length', min: 40, max: 256, message: 'at least 40 characters' },
  ],
}
