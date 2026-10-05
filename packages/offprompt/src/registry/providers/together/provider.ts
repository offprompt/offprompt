import type { Provider } from '../../schema.js'
import { apiKey } from './api-key.js'
import { logo } from './logo.js'

export const together: Provider = {
  id: 'together',
  name: 'Together AI',
  category: 'ai',
  homepage: 'https://www.together.ai',
  logo,
  color: '#0F6FFF',
  domains: ['together.ai'],
  credentials: [apiKey],
  offers: [],
}
