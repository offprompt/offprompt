import type { Credential } from '../../schema.js'

// Axiom's Go client accepts a token that starts with xaat- (an API token) or xapt- (a personal
// access token), and the CLI and the JavaScript client read either from AXIOM_TOKEN.
export const apiToken: Credential = {
  id: 'api_token',
  label: 'API token',
  names: ['AXIOM_TOKEN'],
  url: 'https://app.axiom.co/settings/api-tokens',
  placeholder: 'xaat-…',
  rules: [
    { kind: 'prefix', anyOf: ['xaat-', 'xapt-'], message: 'starts with xaat- or xapt-' },
    { kind: 'length', min: 30, max: 256, message: 'at least 30 characters' },
  ],
}
