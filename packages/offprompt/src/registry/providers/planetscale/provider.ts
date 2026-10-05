import type { Provider } from '../../schema.js'
import { logo } from './logo.js'
import { password } from './password.js'
import { serviceToken } from './service-token.js'
import { serviceTokenId } from './service-token-id.js'

export const planetscale: Provider = {
  id: 'planetscale',
  name: 'PlanetScale',
  category: 'data',
  homepage: 'https://planetscale.com',
  logo,
  domains: ['planetscale.com'],
  credentials: [password, serviceToken, serviceTokenId],
  offers: [{ format: 'postgres_url', url: 'https://app.planetscale.com/new' }],
}
