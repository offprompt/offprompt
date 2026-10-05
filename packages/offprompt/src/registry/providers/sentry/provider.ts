import type { Provider } from '../../schema.js'
import { authToken } from './auth-token.js'
import { dsn } from './dsn.js'
import { logo } from './logo.js'

export const sentry: Provider = {
  id: 'sentry',
  name: 'Sentry',
  category: 'product',
  homepage: 'https://sentry.io',
  logo,
  color: '#362D59',
  domains: ['sentry.io'],
  credentials: [authToken, dsn],
  offers: [],
}
