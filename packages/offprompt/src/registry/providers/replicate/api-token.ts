import type { Credential } from '../../schema.js'

export const apiToken: Credential = {
  id: 'api_token',
  label: 'API token',
  names: ['REPLICATE_API_TOKEN'],
  url: 'https://replicate.com/account/api-tokens',
  placeholder: 'r8_…',
  rules: [
    { kind: 'prefix', anyOf: ['r8_'], message: 'starts with r8_' },
    { kind: 'length', min: 30, max: 128, message: '30 to 128 characters' },
  ],
}
