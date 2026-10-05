import type { Credential } from '../../schema.js'

// Cohere keys carry no prefix, so only the length is checked.
export const apiKey: Credential = {
  id: 'api_key',
  label: 'API key',
  names: ['CO_API_KEY', 'COHERE_API_KEY'],
  url: 'https://dashboard.cohere.com/api-keys',
  rules: [{ kind: 'length', min: 30, max: 128, message: '30 to 128 characters' }],
}
