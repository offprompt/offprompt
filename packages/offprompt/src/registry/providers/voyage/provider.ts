import type { Provider } from '../../schema.js'
import { apiKey } from './api-key.js'
import { logo } from './logo.js'

export const voyage: Provider = {
  id: 'voyage',
  name: 'Voyage AI',
  category: 'ai',
  homepage: 'https://www.voyageai.com',
  logo,
  color: '#012E33',
  domains: ['voyageai.com'],
  credentials: [apiKey],
  offers: [],
}
