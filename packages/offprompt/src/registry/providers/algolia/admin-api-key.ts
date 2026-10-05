import type { Credential } from '../../schema.js'

// The admin key and the write key are for servers and scripts. ALGOLIA_API_KEY is what the
// Algolia CLI and the Gatsby plugin read for it, though the CLI accepts any key under that name.
export const adminApiKey: Credential = {
  id: 'admin_api_key',
  label: 'Admin or write API key',
  names: ['ALGOLIA_ADMIN_API_KEY', 'ALGOLIA_WRITE_API_KEY', 'ALGOLIA_ADMIN_KEY', 'ALGOLIA_API_KEY'],
  url: 'https://dashboard.algolia.com/account/api-keys',
  rules: [
    { kind: 'charset', pattern: '^[0-9a-fA-F]+$', message: 'hexadecimal characters only, 0-9 and a-f' },
    { kind: 'length', min: 32, max: 32, message: '32 characters' },
  ],
}
