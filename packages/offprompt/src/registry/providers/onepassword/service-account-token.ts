import type { Credential } from '../../schema.js'

export const serviceAccountToken: Credential = {
  id: 'service_account_token',
  label: 'Service account token',
  names: ['OP_SERVICE_ACCOUNT_TOKEN'],
  url: 'https://start.1password.com/developer-tools/infrastructure-secrets/serviceaccount/',
  placeholder: 'ops_…',
  rules: [
    { kind: 'prefix', anyOf: ['ops_'], message: 'starts with ops_' },
    { kind: 'length', min: 200, max: 4096, message: 'at least 200 characters' },
  ],
}
