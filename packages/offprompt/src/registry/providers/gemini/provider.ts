import type { Provider } from '../../schema.js'
import { apiKey } from './api-key.js'
import { logo } from './logo.js'

export const gemini: Provider = {
  id: 'gemini',
  name: 'Google Gemini',
  category: 'ai',
  homepage: 'https://ai.google.dev/gemini-api',
  logo,
  color: '#8E75B2',
  domains: ['aistudio.google.com', 'ai.google.dev'],
  credentials: [apiKey],
  offers: [],
}
