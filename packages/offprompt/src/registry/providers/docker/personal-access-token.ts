import type { Credential } from '../../schema.js'

export const personalAccessToken: Credential = {
  id: 'personal_access_token',
  label: 'Personal access token',
  names: ['DOCKERHUB_TOKEN'],
  url: 'https://app.docker.com/settings/personal-access-tokens',
  placeholder: 'dckr_pat_…',
  rules: [
    {
      kind: 'either',
      options: [
        [
          { kind: 'prefix', anyOf: ['dckr_pat_', 'dckr_oat_'], message: 'starts with dckr_pat_ or dckr_oat_' },
          { kind: 'length', min: 30, max: 256, message: 'at least 30 characters' },
        ],
        [{ kind: 'format', format: 'uuid', message: 'a UUID' }],
      ],
      message: 'a dckr_pat_ token, or an older token that is a UUID',
    },
  ],
}
