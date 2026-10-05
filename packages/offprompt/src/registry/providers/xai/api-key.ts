import type { Credential } from '../../schema.js'

export const apiKey: Credential = {
  id: 'api_key',
  label: 'API key',
  names: ['XAI_API_KEY'],
  url: 'https://console.x.ai/team/default/api-keys',
  placeholder: 'xai-…',
  rules: [
    { kind: 'prefix', anyOf: ['xai-'], message: 'starts with xai-' },
    { kind: 'length', min: 40, max: 256, message: 'at least 40 characters' },
  ],
}
