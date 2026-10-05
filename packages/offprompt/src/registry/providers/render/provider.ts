import type { Provider } from '../../schema.js'
import { apiKey } from './api-key.js'
import { logo } from './logo.js'

export const render: Provider = {
  id: 'render',
  name: 'Render',
  category: 'deploy',
  homepage: 'https://render.com',
  logo,
  domains: ['render.com'],
  credentials: [apiKey],
  offers: [],
}
