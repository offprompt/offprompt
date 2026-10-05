import type { Provider } from '../../schema.js'
import { logo } from './logo.js'
import { personalAccessToken } from './personal-access-token.js'
import { username } from './username.js'

export const docker: Provider = {
  id: 'docker',
  name: 'Docker Hub',
  category: 'deploy',
  homepage: 'https://hub.docker.com',
  logo,
  color: '#2496ED',
  domains: ['docker.com'],
  credentials: [personalAccessToken, username],
  offers: [],
}
