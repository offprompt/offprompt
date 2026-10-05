import type { Credential } from '../../schema.js'

// Mapbox tokens are three dot-separated parts whose first is pk, sk or tk. A public token is made
// for client-side code, where anyone can read it, so it is not a secret. The CLIs read it as
// MAPBOX_ACCESS_TOKEN, though the tilesets CLI wants a secret token under that name.
export const publicToken: Credential = {
  id: 'public_token',
  label: 'Public access token',
  names: ['MAPBOX_ACCESS_TOKEN', 'MAPBOX_TOKEN'],
  url: 'https://console.mapbox.com/account/access-tokens/',
  placeholder: 'pk.…',
  secret: false,
  rules: [
    { kind: 'prefix', anyOf: ['pk.'], message: 'starts with pk.' },
    { kind: 'length', min: 40, max: 512, message: 'at least 40 characters' },
  ],
}
