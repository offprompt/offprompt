import type { Provider } from '../../schema.js'
import { adminApiKey } from './admin-api-key.js'
import { applicationId } from './application-id.js'
import { logo } from './logo.js'
import { searchApiKey } from './search-api-key.js'

export const algolia: Provider = {
  id: 'algolia',
  name: 'Algolia',
  category: 'product',
  homepage: 'https://www.algolia.com',
  logo,
  color: '#003DFF',
  domains: ['algolia.com'],
  credentials: [applicationId, searchApiKey, adminApiKey],
  offers: [],
}
