import type { Provider } from '../../schema.js'
import { apiKey } from './api-key.js'
import { logo } from './logo.js'

export const openai: Provider = {
  id: 'openai',
  name: 'OpenAI',
  category: 'ai',
  homepage: 'https://openai.com',
  logo,
  domains: ['openai.com'],
  credentials: [apiKey],
  offers: [],
}
