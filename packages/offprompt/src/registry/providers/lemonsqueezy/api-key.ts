import type { Credential } from '../../schema.js'

export const apiKey: Credential = {
  id: 'api_key',
  label: 'API key',
  names: ['LEMONSQUEEZY_API_KEY', 'LEMON_SQUEEZY_API_KEY'],
  url: 'https://app.lemonsqueezy.com/settings/api',
  placeholder: 'eyJ…',
  rules: [{ kind: 'format', format: 'jwt', message: 'a JWT, which starts with eyJ' }],
}
