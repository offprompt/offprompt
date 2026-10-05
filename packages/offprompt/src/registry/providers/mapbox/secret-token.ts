import type { Credential } from '../../schema.js'

// A secret token carries secret scopes and is for servers. MAPBOX_DOWNLOADS_TOKEN is the one the
// Android SDK's install guide has Gradle read, a secret token with the Downloads:Read scope.
export const secretToken: Credential = {
  id: 'secret_token',
  label: 'Secret access token',
  names: ['MAPBOX_SECRET_TOKEN', 'MAPBOX_DOWNLOADS_TOKEN'],
  url: 'https://console.mapbox.com/account/access-tokens/',
  placeholder: 'sk.…',
  rules: [
    { kind: 'prefix', anyOf: ['sk.'], message: 'starts with sk.' },
    { kind: 'length', min: 40, max: 512, message: 'at least 40 characters' },
  ],
}
