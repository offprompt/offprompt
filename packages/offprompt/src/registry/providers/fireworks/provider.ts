import type { Provider } from '../../schema.js'
import { apiKey } from './api-key.js'
import { logo } from './logo.js'

export const fireworks: Provider = {
  id: 'fireworks',
  name: 'Fireworks AI',
  category: 'ai',
  homepage: 'https://fireworks.ai',
  logo,
  color: '#5019C5',
  domains: ['fireworks.ai'],
  credentials: [apiKey],
  offers: [],
}
