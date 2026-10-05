import type { Credential } from '../../schema.js'

/**
 * Tokens issued since November 2023 start with nfp_ (personal), nfc_ (CLI) or nfo_ (OAuth);
 * earlier ones have no prefix and still work, so the second option keeps them valid and the
 * first lets the page recognise the new ones.
 */
export const personalAccessToken: Credential = {
  id: 'personal_access_token',
  label: 'Personal access token',
  names: ['NETLIFY_AUTH_TOKEN'],
  url: 'https://app.netlify.com/user/applications#personal-access-tokens',
  placeholder: 'nfp_…',
  rules: [
    {
      kind: 'either',
      options: [
        [
          { kind: 'prefix', anyOf: ['nfp_', 'nfc_', 'nfo_'], message: 'starts with nfp_, nfc_ or nfo_' },
          { kind: 'length', min: 40, max: 256, message: 'at least 40 characters' },
        ],
        [{ kind: 'length', min: 40, max: 256, message: 'at least 40 characters' }],
      ],
      message: 'at least 40 characters',
    },
  ],
}
