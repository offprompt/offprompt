import type { Credential } from '../../schema.js'

export const secretKey: Credential = {
  id: 'secret_key',
  label: 'Secret key',
  names: ['CLERK_SECRET_KEY'],
  url: 'https://dashboard.clerk.com/last-active?path=api-keys',
  placeholder: 'sk_test_…',
  rules: [
    { kind: 'prefix', anyOf: ['sk_live_', 'sk_test_'], message: 'starts with sk_live_ or sk_test_' },
    { kind: 'length', min: 20, max: 256, message: 'at least 20 characters' },
  ],
}
