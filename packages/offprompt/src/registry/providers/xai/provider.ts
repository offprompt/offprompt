import type { Provider } from '../../schema.js'
import { apiKey } from './api-key.js'
import { logo } from './logo.js'

export const xai: Provider = {
  id: 'xai',
  name: 'xAI',
  category: 'ai',
  homepage: 'https://x.ai',
  logo,
  domains: ['x.ai'],
  credentials: [apiKey],
  offers: [],
}
