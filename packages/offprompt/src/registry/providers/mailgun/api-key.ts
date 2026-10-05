import type { Credential } from '../../schema.js'

export const apiKey: Credential = {
  id: 'api_key',
  label: 'API key',
  names: ['MAILGUN_API_KEY', 'MAILGUN_SECRET'],
  url: 'https://app.mailgun.com/settings/api_security',
  rules: [
    {
      kind: 'either',
      options: [
        [
          { kind: 'prefix', anyOf: ['key-'], message: 'starts with key-' },
          { kind: 'length', min: 20, max: 80, message: '20 to 80 characters' },
        ],
        [
          {
            kind: 'charset',
            pattern: '^[0-9a-fA-F]{32}-[0-9a-fA-F]{8}-[0-9a-fA-F]{8}$',
            message: 'hex in groups of 32, 8 and 8 joined by dashes',
          },
        ],
      ],
      message: 'a key- key, or the newer hex key in groups of 32, 8 and 8 joined by dashes',
    },
  ],
}
