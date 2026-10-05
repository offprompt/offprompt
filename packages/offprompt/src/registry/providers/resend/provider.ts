import type { Provider } from '../../schema.js'
import { apiKey } from './api-key.js'
import { logo } from './logo.js'

export const resend: Provider = {
  id: 'resend',
  name: 'Resend',
  category: 'messaging',
  homepage: 'https://resend.com',
  logo,
  domains: ['resend.com'],
  credentials: [apiKey],
  offers: [],
}
