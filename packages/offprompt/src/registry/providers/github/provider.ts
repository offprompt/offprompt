import type { Provider } from '../../schema.js'
import { logo } from './logo.js'
import { personalAccessToken } from './personal-access-token.js'

export const github: Provider = {
  id: 'github',
  name: 'GitHub',
  category: 'deploy',
  homepage: 'https://github.com',
  logo,
  domains: ['github.com'],
  credentials: [personalAccessToken],
  offers: [],
}
