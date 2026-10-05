import type { Credential } from '../../schema.js'

export const apiKey: Credential = {
  id: 'api_key',
  label: 'API key',
  names: ['DEEPSEEK_API_KEY'],
  url: 'https://platform.deepseek.com/api_keys',
  placeholder: 'sk-…',
  rules: [
    { kind: 'prefix', anyOf: ['sk-'], message: 'starts with sk-' },
    { kind: 'length', min: 30, max: 100, message: '30 to 100 characters' },
  ],
}
