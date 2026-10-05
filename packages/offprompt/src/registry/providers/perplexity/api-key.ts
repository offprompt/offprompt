import type { Credential } from '../../schema.js'

export const apiKey: Credential = {
  id: 'api_key',
  label: 'API key',
  names: ['PERPLEXITY_API_KEY', 'PPLX_API_KEY'],
  url: 'https://console.perplexity.ai/project/keys',
  placeholder: 'pplx-…',
  rules: [
    { kind: 'prefix', anyOf: ['pplx-'], message: 'starts with pplx-' },
    { kind: 'length', min: 40, max: 256, message: 'at least 40 characters' },
  ],
}
