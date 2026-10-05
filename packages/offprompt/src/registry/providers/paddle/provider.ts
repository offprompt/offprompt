import type { Provider } from '../../schema.js'
import { apiKey } from './api-key.js'
import { clientToken } from './client-token.js'
import { logo } from './logo.js'
import { webhookSecret } from './webhook-secret.js'

export const paddle: Provider = {
  id: 'paddle',
  name: 'Paddle',
  category: 'payments',
  homepage: 'https://www.paddle.com',
  logo,
  domains: ['paddle.com'],
  credentials: [apiKey, clientToken, webhookSecret],
  offers: [],
}
