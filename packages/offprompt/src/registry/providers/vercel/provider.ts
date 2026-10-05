import type { Provider } from '../../schema.js'
import { accessToken } from './access-token.js'
import { logo } from './logo.js'

export const vercel: Provider = {
  id: 'vercel',
  name: 'Vercel',
  category: 'deploy',
  homepage: 'https://vercel.com',
  logo,
  domains: ['vercel.com'],
  credentials: [accessToken],
  offers: [],
}
