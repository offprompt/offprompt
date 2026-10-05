import type { Credential } from '../../schema.js'

// Algolia's docs call the search-only key safe to use in production frontend code. Every key the
// dashboard makes, search-only, write or admin, is 32 hex characters in Algolia's own examples,
// so the format cannot tell this key from the admin one. A secured API key, which is made in
// code, is a longer base64 string and is not a value to collect.
export const searchApiKey: Credential = {
  id: 'search_api_key',
  label: 'Search-only API key',
  names: ['ALGOLIA_SEARCH_API_KEY', 'ALGOLIA_SEARCH_KEY'],
  url: 'https://dashboard.algolia.com/account/api-keys',
  secret: false,
  rules: [
    { kind: 'charset', pattern: '^[0-9a-fA-F]+$', message: 'hexadecimal characters only, 0-9 and a-f' },
    { kind: 'length', min: 32, max: 32, message: '32 characters' },
  ],
}
