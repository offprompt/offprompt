import type { Credential } from '../../schema.js'

export const apiKey: Credential = {
  id: 'api_key',
  label: 'Personal API key',
  names: ['LINEAR_API_KEY'],
  url: 'https://linear.app/settings/account/security',
  placeholder: 'lin_api_…',
  rules: [
    { kind: 'prefix', anyOf: ['lin_api_'], message: 'starts with lin_api_' },
    { kind: 'length', min: 30, max: 128, message: 'at least 30 characters' },
  ],
}
