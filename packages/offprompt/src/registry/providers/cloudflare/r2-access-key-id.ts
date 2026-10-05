import type { Credential } from '../../schema.js'

/** R2 gives the ID of the API token it made, 32 hex digits, as the access key ID. */
export const r2AccessKeyId: Credential = {
  id: 'r2_access_key_id',
  label: 'R2 access key ID',
  names: ['R2_ACCESS_KEY_ID'],
  url: 'https://dash.cloudflare.com/?to=/:account/r2/overview',
  rules: [
    { kind: 'length', min: 32, max: 32, message: '32 characters' },
    { kind: 'charset', pattern: '^[0-9a-fA-F]*$', message: 'hexadecimal characters only, 0-9 and a-f' },
  ],
}
