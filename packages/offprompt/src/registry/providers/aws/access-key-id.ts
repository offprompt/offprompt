import type { Credential } from '../../schema.js'

/** AKIA is a long-term key, ASIA a temporary one made by STS, which comes with a session token. */
export const accessKeyId: Credential = {
  id: 'access_key_id',
  label: 'Access key ID',
  names: ['AWS_ACCESS_KEY_ID'],
  url: 'https://console.aws.amazon.com/iam/home#/security_credentials',
  placeholder: 'AKIA…',
  rules: [
    { kind: 'prefix', anyOf: ['AKIA', 'ASIA'], message: 'starts with AKIA or ASIA' },
    { kind: 'length', min: 16, max: 128, message: '16 to 128 characters' },
  ],
}
