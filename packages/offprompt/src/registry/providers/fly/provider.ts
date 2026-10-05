import type { Provider } from '../../schema.js'
import { accessToken } from './access-token.js'
import { logo } from './logo.js'

export const fly: Provider = {
  id: 'fly',
  name: 'Fly.io',
  category: 'deploy',
  homepage: 'https://fly.io',
  logo,
  color: '#24175B',
  domains: ['fly.io'],
  credentials: [accessToken],
  offers: [],
}
