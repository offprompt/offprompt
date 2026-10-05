import type { Credential } from '../../schema.js'

export const apiKey: Credential = {
  id: 'api_key',
  label: 'API key',
  names: ['MISTRAL_API_KEY'],
  url: 'https://console.mistral.ai/api-keys',
  rules: [{ kind: 'length', min: 20, max: 128, message: '20 to 128 characters' }],
}
