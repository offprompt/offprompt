import type { Credential } from '../../schema.js'

export const serviceTokenId: Credential = {
  id: 'service_token_id',
  label: 'Service token ID',
  names: ['PLANETSCALE_SERVICE_TOKEN_ID'],
  url: 'https://app.planetscale.com/~/settings/service-tokens',
  rules: [{ kind: 'length', min: 6, max: 64, message: '6 to 64 characters' }],
}
