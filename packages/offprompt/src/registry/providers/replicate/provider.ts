import type { Provider } from '../../schema.js'
import { apiToken } from './api-token.js'
import { logo } from './logo.js'

export const replicate: Provider = {
  id: 'replicate',
  name: 'Replicate',
  category: 'ai',
  homepage: 'https://replicate.com',
  logo,
  domains: ['replicate.com'],
  credentials: [apiToken],
  offers: [],
}
