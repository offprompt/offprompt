import type { Provider } from '../../schema.js'
import { logo } from './logo.js'
import { personalAccessToken } from './personal-access-token.js'
import { spacesAccessKeyId } from './spaces-access-key-id.js'
import { spacesSecretAccessKey } from './spaces-secret-access-key.js'

export const digitalocean: Provider = {
  id: 'digitalocean',
  name: 'DigitalOcean',
  category: 'deploy',
  homepage: 'https://www.digitalocean.com',
  logo,
  color: '#0080FF',
  domains: ['digitalocean.com'],
  credentials: [personalAccessToken, spacesAccessKeyId, spacesSecretAccessKey],
  offers: [],
}
