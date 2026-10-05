import type { Credential } from '../../schema.js'

export const accessToken: Credential = {
  id: 'access_token',
  label: 'Access token',
  names: ['NPM_TOKEN'],
  url: 'https://www.npmjs.com/settings/~/tokens',
  placeholder: 'npm_…',
  rules: [
    { kind: 'prefix', anyOf: ['npm_'], message: 'starts with npm_' },
    { kind: 'length', min: 40, max: 256, message: 'at least 40 characters' },
  ],
}
