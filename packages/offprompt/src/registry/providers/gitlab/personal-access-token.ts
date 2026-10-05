import type { Credential } from '../../schema.js'

/**
 * Personal, project and group access tokens share one shape. glpat- is only the default: an
 * administrator of a self-managed instance can change it, and tokens made before 14.5 have
 * none, so the second option keeps those valid and the first lets the page recognise glpat-.
 */
export const personalAccessToken: Credential = {
  id: 'personal_access_token',
  label: 'Personal access token',
  names: ['GITLAB_TOKEN', 'GITLAB_ACCESS_TOKEN', 'GITLAB_PRIVATE_TOKEN'],
  url: 'https://gitlab.com/-/user_settings/personal_access_tokens',
  placeholder: 'glpat-…',
  rules: [
    {
      kind: 'either',
      options: [
        [
          { kind: 'prefix', anyOf: ['glpat-'], message: 'starts with glpat-' },
          { kind: 'length', min: 26, max: 512, message: 'at least 26 characters' },
        ],
        [{ kind: 'length', min: 20, max: 512, message: 'at least 20 characters' }],
      ],
      message: 'at least 20 characters',
    },
  ],
}
