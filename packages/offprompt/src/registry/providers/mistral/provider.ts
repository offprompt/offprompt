import type { Provider } from '../../schema.js'
import { apiKey } from './api-key.js'
import { logo } from './logo.js'

export const mistral: Provider = {
  id: 'mistral',
  name: 'Mistral AI',
  category: 'ai',
  homepage: 'https://mistral.ai',
  logo,
  color: '#FA520F',
  domains: ['mistral.ai'],
  credentials: [apiKey],
  offers: [],
}
