import type { Credential } from '../../schema.js'

export const authToken: Credential = {
  id: 'auth_token',
  label: 'Auth token',
  names: ['TWILIO_AUTH_TOKEN'],
  url: 'https://console.twilio.com/us1/account/keys-credentials/api-keys',
  rules: [{ kind: 'length', min: 32, max: 32, message: '32 characters' }],
}
