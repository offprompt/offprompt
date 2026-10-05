import type { Credential } from '../../schema.js'

export const adminApiAccessToken: Credential = {
  id: 'admin_api_access_token',
  label: 'Admin API access token',
  names: ['SHOPIFY_ADMIN_API_ACCESS_TOKEN', 'SHOPIFY_ACCESS_TOKEN', 'SHOPIFY_ADMIN_TOKEN'],
  url: 'https://shopify.dev/docs/apps/build/authentication-authorization/access-tokens/generate-app-access-tokens-admin',
  placeholder: 'shpat_…',
  rules: [
    {
      kind: 'either',
      options: [
        [
          { kind: 'prefix', anyOf: ['shpat_', 'shpca_', 'shppa_'], message: 'starts with shpat_, shpca_ or shppa_' },
          { kind: 'length', min: 20, max: 256, message: 'at least 20 characters' },
        ],
        [{ kind: 'charset', pattern: '^[0-9a-f]{32}$', message: '32 hex characters' }],
      ],
      message: 'a shpat_ token, or an older 32-character hex token',
    },
  ],
}
