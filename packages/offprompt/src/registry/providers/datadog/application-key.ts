import type { Credential } from '../../schema.js'

// An application key is 40 hex characters, or ddapp_ and 34 letters and digits, which is
// how the Datadog Agent validates one. Datadog calls application keys legacy from the third
// quarter of 2026 in favour of personal and service access tokens, and says they keep working.
export const applicationKey: Credential = {
  id: 'application_key',
  label: 'Application key',
  names: ['DD_APP_KEY', 'DATADOG_APP_KEY'],
  url: 'https://app.datadoghq.com/organization-settings/application-keys',
  rules: [
    {
      kind: 'either',
      options: [
        [
          { kind: 'charset', pattern: '^[0-9a-fA-F]+$', message: 'hexadecimal characters only, 0-9 and a-f' },
          { kind: 'length', min: 40, max: 40, message: '40 characters' },
        ],
        [
          { kind: 'prefix', anyOf: ['ddapp_'], message: 'starts with ddapp_' },
          { kind: 'length', min: 40, max: 40, message: '40 characters' },
        ],
      ],
      message: '40 hexadecimal characters, or a 40-character ddapp_ key',
    },
  ],
}
