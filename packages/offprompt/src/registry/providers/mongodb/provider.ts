import type { Provider } from '../../schema.js'
import { connectionString } from './connection-string.js'
import { logo } from './logo.js'

export const mongodb: Provider = {
  id: 'mongodb',
  name: 'MongoDB Atlas',
  category: 'data',
  homepage: 'https://www.mongodb.com',
  logo,
  color: '#47A248',
  domains: ['mongodb.com'],
  credentials: [connectionString],
  offers: [],
}
