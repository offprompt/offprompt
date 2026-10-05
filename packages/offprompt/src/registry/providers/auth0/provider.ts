import type { Provider } from '../../schema.js'
import { clientId } from './client-id.js'
import { clientSecret } from './client-secret.js'
import { domain } from './domain.js'
import { logo } from './logo.js'

export const auth0: Provider = {
  id: 'auth0',
  name: 'Auth0',
  category: 'auth',
  homepage: 'https://auth0.com',
  logo,
  color: '#EB5424',
  domains: ['auth0.com'],
  credentials: [domain, clientId, clientSecret],
  offers: [],
}
