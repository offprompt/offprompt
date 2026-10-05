import type { Provider } from '../../schema.js'
import { logo } from './logo.js'
import { personalAccessToken } from './personal-access-token.js'

export const netlify: Provider = {
  id: 'netlify',
  name: 'Netlify',
  category: 'deploy',
  homepage: 'https://www.netlify.com',
  logo,
  color: '#00C7B7',
  domains: ['netlify.com'],
  credentials: [personalAccessToken],
  offers: [],
}
