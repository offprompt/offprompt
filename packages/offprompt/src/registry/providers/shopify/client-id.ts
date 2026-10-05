import type { Credential } from '../../schema.js'

export const clientId: Credential = {
  id: 'client_id',
  label: 'Client ID',
  names: ['SHOPIFY_API_KEY', 'SHOPIFY_CLIENT_ID'],
  url: 'https://dev.shopify.com/dashboard',
  placeholder: 'a61950a2cbd5f32876b0b55587ec7a27',
  secret: false,
  rules: [{ kind: 'length', min: 20, max: 64, message: '20 to 64 characters' }],
}
