import type { Provider } from '../../schema.js'
import { logo } from './logo.js'
import { serviceAccountToken } from './service-account-token.js'

export const onepassword: Provider = {
  id: 'onepassword',
  name: '1Password',
  category: 'stores',
  homepage: 'https://1password.com',
  logo,
  color: '#145FE4',
  domains: ['1password.com'],
  credentials: [serviceAccountToken],
  offers: [],
}
