import type { Provider } from '../../schema.js'
import { apiKey } from './api-key.js'
import { logo } from './logo.js'

export const anthropic: Provider = {
  id: 'anthropic',
  name: 'Anthropic',
  category: 'ai',
  homepage: 'https://www.anthropic.com',
  logo,
  domains: ['anthropic.com', 'claude.com'],
  credentials: [apiKey],
  offers: [],
}
