import type { Credential } from '../../schema.js'

/**
 * flyctl reads a token with or without its FlyV1 scheme, as several tokens joined by commas,
 * and takes any other start as a user token. Fly has changed the form more than once (fo1_,
 * fm1r_, fm1a_, fm2_), so the second option keeps the next one valid and the first lets the
 * page recognise the ones that exist.
 */
export const accessToken: Credential = {
  id: 'access_token',
  label: 'Access token',
  names: ['FLY_API_TOKEN', 'FLY_ACCESS_TOKEN'],
  url: 'https://fly.io/tokens',
  placeholder: 'FlyV1 fm2_…',
  rules: [
    {
      kind: 'either',
      options: [
        [
          {
            kind: 'prefix',
            anyOf: ['FlyV1 ', 'fm2_', 'fm1r_', 'fm1a_', 'fo1_'],
            message: 'starts with FlyV1, fm2_ or fo1_',
          },
          { kind: 'length', min: 40, max: 8192, message: 'at least 40 characters' },
        ],
        [{ kind: 'length', min: 40, max: 8192, message: 'at least 40 characters' }],
      ],
      message: 'at least 40 characters',
    },
  ],
}
