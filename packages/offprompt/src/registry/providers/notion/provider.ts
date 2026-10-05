import type { Provider } from '../../schema.js'
import { apiToken } from './api-token.js'
import { logo } from './logo.js'

export const notion: Provider = {
  id: 'notion',
  name: 'Notion',
  category: 'product',
  homepage: 'https://www.notion.com',
  logo,
  domains: ['notion.com', 'notion.so'],
  credentials: [apiToken],
  offers: [],
}
