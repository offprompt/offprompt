import type { Credential } from '../../schema.js'

export const apiKey: Credential = {
  id: 'api_key',
  label: 'API key',
  names: ['GEMINI_API_KEY', 'GOOGLE_GENERATIVE_AI_API_KEY'],
  url: 'https://aistudio.google.com/api-keys',
  placeholder: 'AQ.…',
  rules: [
    { kind: 'prefix', anyOf: ['AQ.', 'AIza'], message: 'starts with AQ. or AIza' },
    { kind: 'length', min: 30, max: 256, message: 'at least 30 characters' },
  ],
}
