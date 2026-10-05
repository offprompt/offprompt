import type { Credential } from '../../schema.js'

export const apiKey: Credential = {
  id: 'api_key',
  label: 'API key',
  names: ['PADDLE_API_KEY'],
  url: 'https://vendors.paddle.com/settings/authentication',
  placeholder: 'pdl_sdbx_apikey_…',
  rules: [
    {
      kind: 'either',
      options: [
        [
          {
            kind: 'prefix',
            anyOf: ['pdl_sdbx_apikey_', 'pdl_live_apikey_'],
            message: 'starts with pdl_sdbx_apikey_ or pdl_live_apikey_',
          },
          { kind: 'length', min: 60, max: 100, message: '60 to 100 characters' },
        ],
        [{ kind: 'charset', pattern: '^[a-z0-9]{50}$', message: '50 lowercase letters and digits' }],
      ],
      message: 'a pdl_sdbx_apikey_ or pdl_live_apikey_ key, or a legacy 50-character key',
    },
  ],
}
