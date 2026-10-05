import type { Credential } from '../../schema.js'

export const clientSecret: Credential = {
  id: 'client_secret',
  label: 'Client secret',
  names: ['SHOPIFY_API_SECRET', 'SHOPIFY_CLIENT_SECRET'],
  url: 'https://dev.shopify.com/dashboard',
  placeholder: 'shpss_…',
  rules: [
    {
      kind: 'either',
      options: [
        [
          { kind: 'prefix', anyOf: ['shpss_'], message: 'starts with shpss_' },
          { kind: 'length', min: 20, max: 256, message: 'at least 20 characters' },
        ],
        [{ kind: 'charset', pattern: '^[0-9a-f]{32}$', message: '32 hex characters' }],
      ],
      message: 'a shpss_ secret, or an older 32-character hex secret',
    },
  ],
}
