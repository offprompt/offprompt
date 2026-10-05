import type { Provider } from '../../schema.js'
import { accessToken } from './access-token.js'
import { logo } from './logo.js'

export const npm: Provider = {
  id: 'npm',
  name: 'npm',
  category: 'deploy',
  homepage: 'https://www.npmjs.com',
  logo,
  color: '#CB3837',
  domains: ['npmjs.com'],
  credentials: [accessToken],
  offers: [],
}
