import type { Provider } from '../../schema.js'
import { apiKey } from './api-key.js'
import { logo } from './logo.js'

export const groq: Provider = {
  id: 'groq',
  name: 'Groq',
  category: 'ai',
  homepage: 'https://groq.com',
  logo,
  color: '#F55036',
  domains: ['groq.com'],
  credentials: [apiKey],
  offers: [],
}
