import type { Credential } from '../../schema.js'

export const publishableKey: Credential = {
  id: 'publishable_key',
  label: 'Publishable key',
  names: ['CLERK_PUBLISHABLE_KEY'],
  url: 'https://dashboard.clerk.com/last-active?path=api-keys',
  placeholder: 'pk_test_…',
  secret: false,
  rules: [
    { kind: 'prefix', anyOf: ['pk_live_', 'pk_test_'], message: 'starts with pk_live_ or pk_test_' },
    { kind: 'length', min: 20, max: 512, message: 'at least 20 characters' },
  ],
}
