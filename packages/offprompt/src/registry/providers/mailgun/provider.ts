import type { Provider } from '../../schema.js'
import { apiKey } from './api-key.js'
import { logo } from './logo.js'
import { sendingDomain } from './sending-domain.js'

export const mailgun: Provider = {
  id: 'mailgun',
  name: 'Mailgun',
  category: 'messaging',
  homepage: 'https://www.mailgun.com',
  logo,
  color: '#F06B66',
  domains: ['mailgun.com'],
  credentials: [apiKey, sendingDomain],
  offers: [],
}
