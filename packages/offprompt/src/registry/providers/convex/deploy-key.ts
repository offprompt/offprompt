import type { Credential } from '../../schema.js'

export const deployKey: Credential = {
  id: 'deploy_key',
  label: 'Deploy key',
  names: ['CONVEX_DEPLOY_KEY', 'CONVEX_DEPLOYMENT_TOKEN'],
  url: 'https://dashboard.convex.dev/deployment/settings',
  placeholder: 'prod:…',
  rules: [
    {
      kind: 'either',
      options: [
        [
          {
            kind: 'prefix',
            anyOf: ['prod:', 'dev:', 'preview:', 'project:'],
            message: 'starts with prod:, dev: or preview:',
          },
          { kind: 'charset', pattern: '\\|', message: 'a | after the name' },
        ],
        [{ kind: 'charset', pattern: '^[A-Za-z0-9-]+\\|[A-Za-z0-9]+$', message: 'an admin key, name|key' }],
      ],
      message: 'a deploy key, such as prod:name|…',
    },
    { kind: 'length', min: 40, max: 4096, message: 'at least 40 characters' },
  ],
  example: 'prod:happy-animal-123|EXAMPLE0ffpr0mptK3yN0tRea1x9K2mQ7vL4pR8tW',
}
