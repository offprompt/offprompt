import type { Provider } from '../../schema.js'
import { logo } from './logo.js'
import { personalAccessToken } from './personal-access-token.js'

export const gitlab: Provider = {
  id: 'gitlab',
  name: 'GitLab',
  category: 'deploy',
  homepage: 'https://gitlab.com',
  logo,
  color: '#FC6D26',
  domains: ['gitlab.com'],
  credentials: [personalAccessToken],
  offers: [],
}
