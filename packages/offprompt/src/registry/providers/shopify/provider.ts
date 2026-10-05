import type { Provider } from '../../schema.js'
import { adminApiAccessToken } from './admin-api-access-token.js'
import { clientId } from './client-id.js'
import { clientSecret } from './client-secret.js'
import { logo } from './logo.js'

export const shopify: Provider = {
  id: 'shopify',
  name: 'Shopify',
  category: 'payments',
  homepage: 'https://www.shopify.com',
  logo,
  color: '#7AB55C',
  domains: ['shopify.com', 'shopify.dev'],
  credentials: [adminApiAccessToken, clientId, clientSecret],
  offers: [],
}
