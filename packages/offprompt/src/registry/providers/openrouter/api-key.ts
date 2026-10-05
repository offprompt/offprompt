import type { Credential } from '../../schema.js'

export const apiKey: Credential = {
  id: 'api_key',
  label: 'API key',
  names: ['OPENROUTER_API_KEY'],
  url: 'https://openrouter.ai/settings/keys',
  placeholder: 'sk-or-v1-…',
  rules: [
    { kind: 'prefix', anyOf: ['sk-or-'], message: 'starts with sk-or-' },
    { kind: 'length', min: 40, max: 256, message: 'at least 40 characters' },
  ],
}
