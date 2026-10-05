import type { Credential } from '../../schema.js'

export const clientToken: Credential = {
  id: 'client_token',
  label: 'Client-side token',
  names: ['PADDLE_CLIENT_TOKEN', 'PADDLE_CLIENT_SIDE_TOKEN'],
  url: 'https://vendors.paddle.com/settings/authentication',
  placeholder: 'test_…',
  secret: false,
  rules: [
    { kind: 'prefix', anyOf: ['test_', 'live_'], message: 'starts with test_ or live_' },
    { kind: 'length', min: 20, max: 64, message: '20 to 64 characters' },
  ],
}
