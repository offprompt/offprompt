import type { Credential } from '../../schema.js'

export const personalApiKey: Credential = {
  id: 'personal_api_key',
  label: 'Personal API key',
  names: ['POSTHOG_PERSONAL_API_KEY', 'POSTHOG_CLI_API_KEY'],
  url: 'https://us.posthog.com/settings/user-api-keys',
  placeholder: 'phx_…',
  rules: [
    { kind: 'prefix', anyOf: ['phx_'], message: 'starts with phx_' },
    { kind: 'length', min: 40, max: 256, message: 'at least 40 characters' },
  ],
}
