import type { Credential } from '../../schema.js'

/**
 * Tokens made since April 2022 start with dop_v1_ (control panel) or doo_v1_ (OAuth); earlier
 * ones have no prefix and still work, so the second option keeps them valid and the first
 * lets the page recognise the new ones.
 */
export const personalAccessToken: Credential = {
  id: 'personal_access_token',
  label: 'Personal access token',
  names: ['DIGITALOCEAN_ACCESS_TOKEN', 'DIGITALOCEAN_TOKEN'],
  url: 'https://cloud.digitalocean.com/account/api/tokens',
  placeholder: 'dop_v1_…',
  rules: [
    {
      kind: 'either',
      options: [
        [
          { kind: 'prefix', anyOf: ['dop_v1_', 'doo_v1_'], message: 'starts with dop_v1_ or doo_v1_' },
          { kind: 'length', min: 40, max: 256, message: 'at least 40 characters' },
        ],
        [{ kind: 'length', min: 40, max: 256, message: 'at least 40 characters' }],
      ],
      message: 'at least 40 characters',
    },
  ],
}
