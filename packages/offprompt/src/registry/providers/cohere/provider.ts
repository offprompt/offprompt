import type { Provider } from '../../schema.js'
import { apiKey } from './api-key.js'
import { logo } from './logo.js'

export const cohere: Provider = {
  id: 'cohere',
  name: 'Cohere',
  category: 'ai',
  homepage: 'https://cohere.com',
  logo,
  color: '#39594D',
  domains: ['cohere.com'],
  credentials: [apiKey],
  offers: [],
}
