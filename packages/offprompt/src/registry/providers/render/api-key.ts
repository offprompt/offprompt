import type { Credential } from '../../schema.js'

export const apiKey: Credential = {
  id: 'api_key',
  label: 'API key',
  names: ['RENDER_API_KEY'],
  url: 'https://dashboard.render.com/u/settings#api-keys',
  placeholder: 'rnd_…',
  rules: [
    { kind: 'prefix', anyOf: ['rnd_'], message: 'starts with rnd_' },
    { kind: 'length', min: 20, max: 256, message: 'at least 20 characters' },
  ],
}
