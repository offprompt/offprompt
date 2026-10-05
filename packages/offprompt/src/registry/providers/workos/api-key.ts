import type { Credential } from '../../schema.js'

export const apiKey: Credential = {
  id: 'api_key',
  label: 'API key',
  names: ['WORKOS_API_KEY'],
  url: 'https://dashboard.workos.com/api-keys',
  placeholder: 'sk_test_…',
  rules: [
    { kind: 'prefix', anyOf: ['sk_'], message: 'starts with sk_' },
    { kind: 'length', min: 10, max: 512, message: 'at least 10 characters' },
  ],
}
