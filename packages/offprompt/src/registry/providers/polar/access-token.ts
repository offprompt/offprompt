import type { Credential } from '../../schema.js'

export const accessToken: Credential = {
  id: 'access_token',
  label: 'Organization access token',
  names: ['POLAR_ACCESS_TOKEN'],
  url: 'https://polar.sh/to/dashboard/settings',
  placeholder: 'polar_oat_…',
  rules: [
    { kind: 'prefix', anyOf: ['polar_oat_', 'polar_pat_'], message: 'starts with polar_oat_ or polar_pat_' },
    { kind: 'length', min: 30, max: 256, message: 'at least 30 characters' },
  ],
}
