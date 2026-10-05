import type { Provider } from '../../schema.js'
import { apiKey } from './api-key.js'
import { logo } from './logo.js'

export const lemonsqueezy: Provider = {
  id: 'lemonsqueezy',
  name: 'Lemon Squeezy',
  category: 'payments',
  homepage: 'https://www.lemonsqueezy.com',
  logo,
  domains: ['lemonsqueezy.com'],
  credentials: [apiKey],
  offers: [],
}
