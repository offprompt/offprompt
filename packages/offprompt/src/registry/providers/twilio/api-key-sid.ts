import type { Credential } from '../../schema.js'

/** The username half of an API key, an identifier like the Account SID: the secret is the other half. */
export const apiKeySid: Credential = {
  id: 'api_key_sid',
  label: 'API key SID',
  names: ['TWILIO_API_KEY', 'TWILIO_API_KEY_SID'],
  url: 'https://console.twilio.com/us1/account/keys-credentials/api-keys',
  placeholder: 'SK…',
  secret: false,
  rules: [
    { kind: 'prefix', anyOf: ['SK'], message: 'starts with SK' },
    { kind: 'length', min: 34, max: 34, message: '34 characters' },
    { kind: 'charset', pattern: '^SK[0-9a-fA-F]*$', message: 'hexadecimal characters after SK, 0-9 and a-f' },
  ],
}
