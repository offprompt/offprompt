import type { Credential } from '../../schema.js'

export const webhookSecret: Credential = {
  id: 'webhook_secret',
  label: 'Webhook signing secret',
  names: ['STRIPE_WEBHOOK_SECRET'],
  url: 'https://dashboard.stripe.com/webhooks',
  placeholder: 'whsec_…',
  rules: [
    { kind: 'prefix', anyOf: ['whsec_'], message: 'starts with whsec_' },
    { kind: 'length', min: 20, max: 256, message: 'at least 20 characters' },
  ],
}
