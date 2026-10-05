import type { Credential } from '../../schema.js'

/**
 * New user and account tokens are cfut_ or cfat_ and 40 characters and a checksum; tokens
 * made before April 2026 are 40 characters with no prefix. The global API key, cfk_, is a
 * different credential that wrangler reads as CLOUDFLARE_API_KEY.
 */
export const apiToken: Credential = {
  id: 'api_token',
  label: 'API token',
  names: ['CLOUDFLARE_API_TOKEN'],
  url: 'https://dash.cloudflare.com/profile/api-tokens',
  placeholder: 'cfut_…',
  rules: [
    {
      kind: 'either',
      options: [
        [
          { kind: 'prefix', anyOf: ['cfut_', 'cfat_'], message: 'starts with cfut_ or cfat_' },
          { kind: 'length', min: 44, max: 256, message: 'at least 44 characters' },
        ],
        [{ kind: 'length', min: 40, max: 40, message: '40 characters' }],
      ],
      message: 'starts with cfut_ or cfat_, or is 40 characters',
    },
  ],
}
