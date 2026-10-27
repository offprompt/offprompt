import type { Credential } from '../../schema.js'

// Sentry's source gives each kind of token its prefix: sntrys_ for an organization token,
// sntryu_ for a personal one, and sntrya_ and sntryi_ for app and integration tokens. A token
// made before prefixes were added is 64 hex characters, and Sentry still accepts it.
export const authToken: Credential = {
  id: 'auth_token',
  label: 'Auth token',
  names: ['SENTRY_AUTH_TOKEN'],
  url: 'https://sentry.io/settings/auth-tokens/',
  // Sentry's docs link a signed-in reader to their organization's tokens this way, and say
  // the slug is the part of the dashboard's address before .sentry.io.
  template: {
    url: 'https://sentry.io/settings/{org}/auth-tokens/',
    params: {
      org: {
        label: 'the organization slug',
        found:
          'org under [defaults] in .sentryclirc, defaults.org in sentry.properties, SENTRY_ORG, or the part before .sentry.io in its dashboard address',
        max: 64,
      },
    },
  },
  placeholder: 'sntrys_…',
  rules: [
    {
      kind: 'either',
      options: [
        [
          {
            kind: 'prefix',
            anyOf: ['sntrys_', 'sntryu_', 'sntrya_', 'sntryi_'],
            message: 'starts with sntrys_ or sntryu_',
          },
          { kind: 'length', min: 40, max: 1024, message: 'at least 40 characters' },
        ],
        [
          { kind: 'charset', pattern: '^[0-9a-fA-F]+$', message: 'hexadecimal characters only, 0-9 and a-f' },
          { kind: 'length', min: 64, max: 64, message: '64 characters' },
        ],
      ],
      message: 'a sntrys_ or sntryu_ token, or an older 64-character hex token',
    },
  ],
}
