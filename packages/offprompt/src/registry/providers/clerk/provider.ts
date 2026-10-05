import type { Provider } from '../../schema.js'
import { logo } from './logo.js'
import { publishableKey } from './publishable-key.js'
import { secretKey } from './secret-key.js'

export const clerk: Provider = {
  id: 'clerk',
  name: 'Clerk',
  category: 'auth',
  homepage: 'https://clerk.com',
  logo,
  color: '#6C47FF',
  domains: ['clerk.com'],
  credentials: [secretKey, publishableKey],
  offers: [],
}
