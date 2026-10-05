import type { Provider } from '../../schema.js'
import { clientId } from './client-id.js'
import { clientSecret } from './client-secret.js'

export const infisical: Provider = {
  id: 'infisical',
  name: 'Infisical',
  category: 'stores',
  homepage: 'https://infisical.com',
  domains: ['infisical.com'],
  credentials: [clientId, clientSecret],
  offers: [],
}
