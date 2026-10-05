import type { Provider } from '../../schema.js'
import { logo } from './logo.js'

export const neon: Provider = {
  id: 'neon',
  name: 'Neon',
  category: 'data',
  homepage: 'https://neon.com',
  logo,
  domains: ['neon.com', 'neon.tech'],
  credentials: [],
  offers: [{ format: 'postgres_url', url: 'https://console.neon.tech/signup' }],
}
