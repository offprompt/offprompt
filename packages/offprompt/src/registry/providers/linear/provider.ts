import type { Provider } from '../../schema.js'
import { apiKey } from './api-key.js'
import { logo } from './logo.js'

export const linear: Provider = {
  id: 'linear',
  name: 'Linear',
  category: 'product',
  homepage: 'https://linear.app',
  logo,
  color: '#5E6AD2',
  domains: ['linear.app'],
  credentials: [apiKey],
  offers: [],
}
