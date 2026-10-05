import type { Provider } from '../../schema.js'
import { apiKey } from './api-key.js'
import { clientId } from './client-id.js'

// No logo: neither Simple Icons nor lobe-icons has the WorkOS mark, so none is drawn here.
export const workos: Provider = {
  id: 'workos',
  name: 'WorkOS',
  category: 'auth',
  homepage: 'https://workos.com',
  domains: ['workos.com'],
  credentials: [apiKey, clientId],
  offers: [],
}
