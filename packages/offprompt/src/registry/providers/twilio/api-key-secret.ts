import type { Credential } from '../../schema.js'

export const apiKeySecret: Credential = {
  id: 'api_key_secret',
  label: 'API key secret',
  names: ['TWILIO_API_SECRET', 'TWILIO_API_KEY_SECRET'],
  url: 'https://console.twilio.com/us1/account/keys-credentials/api-keys',
  rules: [{ kind: 'length', min: 32, max: 32, message: '32 characters' }],
}
