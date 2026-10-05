import type { Credential } from '../../schema.js'

/** R2 gives the SHA-256 of the API token's value, 64 hex digits, as the secret access key. */
export const r2SecretAccessKey: Credential = {
  id: 'r2_secret_access_key',
  label: 'R2 secret access key',
  names: ['R2_SECRET_ACCESS_KEY'],
  url: 'https://dash.cloudflare.com/?to=/:account/r2/overview',
  rules: [
    { kind: 'length', min: 64, max: 64, message: '64 characters' },
    { kind: 'charset', pattern: '^[0-9a-fA-F]*$', message: 'hexadecimal characters only, 0-9 and a-f' },
  ],
}
