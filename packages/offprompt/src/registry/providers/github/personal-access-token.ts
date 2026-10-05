import type { Credential } from '../../schema.js'

export const personalAccessToken: Credential = {
  id: 'personal_access_token',
  label: 'Personal access token',
  names: ['GITHUB_TOKEN', 'GH_TOKEN', 'GITHUB_PAT', 'GITHUB_PERSONAL_ACCESS_TOKEN'],
  url: 'https://github.com/settings/personal-access-tokens',
  placeholder: 'github_pat_…',
  rules: [
    {
      kind: 'prefix',
      anyOf: ['ghp_', 'github_pat_', 'gho_', 'ghs_'],
      message: 'starts with ghp_ or github_pat_',
    },
    { kind: 'length', min: 36, max: 256, message: 'at least 36 characters' },
  ],
}
