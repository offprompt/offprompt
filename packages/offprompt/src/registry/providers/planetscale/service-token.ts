import type { Credential } from '../../schema.js'

export const serviceToken: Credential = {
  id: 'service_token',
  label: 'Service token',
  names: ['PLANETSCALE_SERVICE_TOKEN'],
  url: 'https://app.planetscale.com/~/settings/service-tokens',
  placeholder: 'pscale_tkn_…',
  rules: [
    { kind: 'prefix', anyOf: ['pscale_tkn_'], message: 'starts with pscale_tkn_' },
    { kind: 'length', min: 30, max: 256, message: 'at least 30 characters' },
  ],
}
