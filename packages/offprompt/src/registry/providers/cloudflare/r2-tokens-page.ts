import type { Template } from '../../schema.js'

/**
 * Where one account's R2 API tokens are made, which give the access key ID and the secret
 * access key. Cloudflare's docs link there as `https://dash.cloudflare.com/<account ID>/r2/api-tokens`,
 * and call the account ID a 32-character hexadecimal identifier.
 */
export const r2TokensPage: Template = {
  url: 'https://dash.cloudflare.com/{account}/r2/api-tokens',
  params: {
    account: {
      label: 'the account ID',
      found: 'account_id in wrangler.toml or wrangler.jsonc, or CLOUDFLARE_ACCOUNT_ID',
      pattern: '^[0-9a-fA-F]{32}$',
      message: '32 hexadecimal digits',
      max: 32,
    },
  },
}
