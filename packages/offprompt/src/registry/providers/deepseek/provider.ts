import type { Provider } from '../../schema.js'
import { apiKey } from './api-key.js'
import { logo } from './logo.js'

export const deepseek: Provider = {
  id: 'deepseek',
  name: 'DeepSeek',
  category: 'ai',
  homepage: 'https://www.deepseek.com',
  logo,
  color: '#5786FE',
  domains: ['deepseek.com'],
  credentials: [apiKey],
  offers: [],
}
