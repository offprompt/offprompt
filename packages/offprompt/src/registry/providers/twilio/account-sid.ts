import type { Credential } from '../../schema.js'

/** An identifier, not a secret: it is sent in every webhook Twilio makes, and shown in the clear in the Console. */
export const accountSid: Credential = {
  id: 'account_sid',
  label: 'Account SID',
  names: ['TWILIO_ACCOUNT_SID'],
  url: 'https://console.twilio.com/',
  placeholder: 'AC…',
  secret: false,
  rules: [
    { kind: 'prefix', anyOf: ['AC'], message: 'starts with AC' },
    { kind: 'length', min: 34, max: 34, message: '34 characters' },
    { kind: 'charset', pattern: '^AC[0-9a-fA-F]*$', message: 'hexadecimal characters after AC, 0-9 and a-f' },
  ],
}
