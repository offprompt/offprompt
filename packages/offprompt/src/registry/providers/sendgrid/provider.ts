import type { Provider } from '../../schema.js'
import { apiKey } from './api-key.js'

export const sendgrid: Provider = {
  id: 'sendgrid',
  name: 'SendGrid',
  category: 'messaging',
  homepage: 'https://sendgrid.com',
  domains: ['sendgrid.com'],
  credentials: [apiKey],
  offers: [],
}
