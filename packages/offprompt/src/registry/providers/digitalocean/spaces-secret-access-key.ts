import type { Credential } from '../../schema.js'

export const spacesSecretAccessKey: Credential = {
  id: 'spaces_secret_access_key',
  label: 'Spaces secret key',
  names: ['SPACES_SECRET_ACCESS_KEY'],
  url: 'https://cloud.digitalocean.com/spaces/access_keys',
  rules: [{ kind: 'length', min: 32, max: 256, message: 'at least 32 characters' }],
}
