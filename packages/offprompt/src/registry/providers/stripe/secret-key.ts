import type { Credential } from '../../schema.js'

export const secretKey: Credential = {
  id: 'secret_key',
  label: 'Secret key',
  names: ['STRIPE_SECRET_KEY', 'STRIPE_API_KEY', 'STRIPE_SK'],
  url: 'https://dashboard.stripe.com/apikeys',
  placeholder: 'sk_test_…',
  rules: [
    {
      kind: 'prefix',
      anyOf: ['sk_live_', 'sk_test_', 'rk_live_', 'rk_test_'],
      message: 'starts with sk_live_, sk_test_, rk_live_ or rk_test_',
    },
    { kind: 'length', min: 30, max: 256, message: 'at least 30 characters' },
  ],
}
