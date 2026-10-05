import type { Credential } from '../../schema.js'

export const webhookSecret: Credential = {
  id: 'webhook_secret',
  label: 'Notification destination secret key',
  names: ['PADDLE_NOTIFICATION_WEBHOOK_SECRET', 'PADDLE_WEBHOOK_SECRET'],
  url: 'https://vendors.paddle.com/notifications-v2',
  placeholder: 'pdl_ntfset_…',
  rules: [
    { kind: 'prefix', anyOf: ['pdl_ntfset_'], message: 'starts with pdl_ntfset_' },
    { kind: 'length', min: 40, max: 256, message: 'at least 40 characters' },
  ],
}
