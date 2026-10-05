import type { Provider } from '../../schema.js'
import { serverToken } from './server-token.js'

export const postmark: Provider = {
  id: 'postmark',
  name: 'Postmark',
  category: 'messaging',
  homepage: 'https://postmarkapp.com',
  domains: ['postmarkapp.com'],
  credentials: [serverToken],
  offers: [],
}
