import type { Credential } from '../../schema.js'

/** Tokens are UUIDs today, which Railway does not promise, so only a floor on the length. */
export const apiToken: Credential = {
  id: 'api_token',
  label: 'Account or workspace token',
  names: ['RAILWAY_API_TOKEN'],
  url: 'https://railway.com/account/tokens',
  rules: [{ kind: 'length', min: 32, max: 256, message: 'at least 32 characters' }],
}
