import type { Provider } from '../../schema.js'
import { apiKey } from './api-key.js'
import { logo } from './logo.js'

export const openrouter: Provider = {
  id: 'openrouter',
  name: 'OpenRouter',
  category: 'ai',
  homepage: 'https://openrouter.ai',
  logo,
  domains: ['openrouter.ai'],
  credentials: [apiKey],
  offers: [],
}
