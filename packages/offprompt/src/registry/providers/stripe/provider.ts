import type { Provider } from '../../schema.js'
import { logo } from './logo.js'
import { publishableKey } from './publishable-key.js'
import { secretKey } from './secret-key.js'
import { webhookSecret } from './webhook-secret.js'

export const stripe: Provider = {
  id: 'stripe',
  name: 'Stripe',
  category: 'payments',
  homepage: 'https://stripe.com',
  logo,
  color: '#635BFF',
  domains: ['stripe.com'],
  credentials: [secretKey, publishableKey, webhookSecret],
  offers: [],
}
