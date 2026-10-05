import type { Credential } from '../../schema.js'

/**
 * An identifier, not a credential: it is in dashboard addresses, in the R2 endpoint, and in
 * the wrangler config that projects commit. Cloudflare's API schema fixes it at 32 hex digits.
 */
export const accountId: Credential = {
  id: 'account_id',
  label: 'Account ID',
  names: ['CLOUDFLARE_ACCOUNT_ID'],
  url: 'https://dash.cloudflare.com/?to=/:account/workers-and-pages',
  secret: false,
  rules: [
    { kind: 'length', min: 32, max: 32, message: '32 characters' },
    { kind: 'charset', pattern: '^[0-9a-fA-F]*$', message: 'hexadecimal characters only, 0-9 and a-f' },
  ],
}
