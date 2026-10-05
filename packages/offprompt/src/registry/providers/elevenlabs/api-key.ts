import type { Credential } from '../../schema.js'

export const apiKey: Credential = {
  id: 'api_key',
  label: 'API key',
  names: ['ELEVENLABS_API_KEY', 'ELEVEN_API_KEY'],
  url: 'https://elevenlabs.io/app/settings/api-keys',
  placeholder: 'sk_…',
  rules: [
    { kind: 'prefix', anyOf: ['sk_'], message: 'starts with sk_' },
    { kind: 'length', min: 20, max: 256, message: 'at least 20 characters' },
  ],
}
