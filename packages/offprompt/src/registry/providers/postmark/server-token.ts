import type { Credential } from '../../schema.js'

export const serverToken: Credential = {
  id: 'server_token',
  label: 'Server API token',
  names: ['POSTMARK_SERVER_TOKEN', 'POSTMARK_API_TOKEN', 'POSTMARK_API_KEY', 'POSTMARK_TOKEN'],
  url: 'https://account.postmarkapp.com/servers',
  rules: [
    {
      kind: 'either',
      options: [
        [{ kind: 'format', format: 'uuid', message: 'a UUID' }],
        [{ kind: 'prefix', anyOf: ['POSTMARK_API_TEST'], message: 'POSTMARK_API_TEST' }],
      ],
      message: 'a UUID, or POSTMARK_API_TEST for test sends',
    },
  ],
}
