import type { Credential } from '../../schema.js'

/**
 * Since February 2026 a token starts with a prefix naming its kind, vcp_ for a personal one,
 * project- and team-scoped ones included, vci_ for an integration's and vca_ for an app's, and
 * goes on in letters, digits and underscores, as the Vercel CLI matches it. A token made before
 * then is 24 letters and numbers, and keeps working, so the second option keeps it valid.
 */
export const accessToken: Credential = {
  id: 'access_token',
  label: 'Access token',
  names: ['VERCEL_TOKEN', 'VERCEL_ACCESS_TOKEN'],
  url: 'https://vercel.com/account/settings/tokens',
  placeholder: 'vcp_…',
  rules: [
    {
      kind: 'either',
      options: [
        [
          { kind: 'prefix', anyOf: ['vcp_', 'vci_', 'vca_'], message: 'starts with vcp_' },
          { kind: 'length', min: 24, max: 256, message: 'at least 24 characters' },
          { kind: 'charset', pattern: '^[A-Za-z0-9_]*$', message: 'letters, numbers and underscores only' },
        ],
        [
          { kind: 'length', min: 24, max: 24, message: '24 characters' },
          { kind: 'charset', pattern: '^[A-Za-z0-9]*$', message: 'letters and numbers only' },
        ],
      ],
      message: 'a vcp_ token, or an older token of 24 letters and numbers',
    },
  ],
}
