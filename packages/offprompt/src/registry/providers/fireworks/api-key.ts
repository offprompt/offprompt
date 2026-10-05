import type { Credential } from '../../schema.js'

export const apiKey: Credential = {
  id: 'api_key',
  label: 'API key',
  names: ['FIREWORKS_API_KEY'],
  url: 'https://app.fireworks.ai/settings/users/api-keys',
  placeholder: 'fw_…',
  rules: [
    { kind: 'prefix', anyOf: ['fw_', 'fpk_'], message: 'starts with fw_ or fpk_' },
    { kind: 'length', min: 20, max: 256, message: 'at least 20 characters' },
  ],
}
