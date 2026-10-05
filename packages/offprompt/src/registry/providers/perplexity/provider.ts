import type { Provider } from '../../schema.js'
import { apiKey } from './api-key.js'
import { logo } from './logo.js'

export const perplexity: Provider = {
  id: 'perplexity',
  name: 'Perplexity',
  category: 'ai',
  homepage: 'https://www.perplexity.ai',
  logo,
  domains: ['perplexity.ai'],
  credentials: [apiKey],
  offers: [],
}
