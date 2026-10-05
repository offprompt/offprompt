import type { Credential } from '../../schema.js'

export const apiKey: Credential = {
  id: 'api_key',
  label: 'API key',
  names: ['OPENAI_API_KEY'],
  url: 'https://platform.openai.com/api-keys',
  placeholder: 'sk-proj-…',
  rules: [
    {
      kind: 'either',
      options: [
        [
          {
            kind: 'prefix',
            anyOf: ['sk-proj-', 'sk-svcacct-', 'sk-None-'],
            message: 'starts with sk-proj-, sk-svcacct- or sk-None-',
          },
          { kind: 'length', min: 40, max: 256, message: 'at least 40 characters' },
        ],
        [{ kind: 'charset', pattern: '^sk-[A-Za-z0-9]{48}$', message: 'sk- and 48 letters and digits' }],
      ],
      message: 'a project, service account or user key, or a legacy sk- key',
    },
  ],
}
