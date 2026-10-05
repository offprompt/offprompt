import type { Credential } from '../../schema.js'

export const publishableKey: Credential = {
  id: 'publishable_key',
  label: 'Publishable key',
  names: ['STRIPE_PUBLISHABLE_KEY', 'STRIPE_PK'],
  url: 'https://dashboard.stripe.com/apikeys',
  placeholder: 'pk_test_…',
  secret: false,
  rules: [
    { kind: 'prefix', anyOf: ['pk_live_', 'pk_test_'], message: 'starts with pk_live_ or pk_test_' },
    { kind: 'length', min: 30, max: 256, message: 'at least 30 characters' },
  ],
}
