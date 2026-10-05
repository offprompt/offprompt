import type { Credential } from '../../schema.js'

// The Datadog Agent validates an API key as exactly 32 hex characters, and its log scrubber
// treats them the same way. The link is for the US1 site, app.datadoghq.com; Datadog's other
// sites have hostnames of their own.
export const apiKey: Credential = {
  id: 'api_key',
  label: 'API key',
  names: ['DD_API_KEY', 'DATADOG_API_KEY'],
  url: 'https://app.datadoghq.com/organization-settings/api-keys',
  rules: [
    { kind: 'charset', pattern: '^[0-9a-fA-F]+$', message: 'hexadecimal characters only, 0-9 and a-f' },
    { kind: 'length', min: 32, max: 32, message: '32 characters' },
  ],
}
