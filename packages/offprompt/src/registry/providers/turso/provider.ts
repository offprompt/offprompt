import type { Provider } from '../../schema.js'
import { authToken } from './auth-token.js'
import { databaseUrl } from './database-url.js'
import { logo } from './logo.js'

export const turso: Provider = {
  id: 'turso',
  name: 'Turso',
  category: 'data',
  homepage: 'https://turso.tech',
  logo,
  domains: ['turso.tech'],
  credentials: [databaseUrl, authToken],
  offers: [],
}
