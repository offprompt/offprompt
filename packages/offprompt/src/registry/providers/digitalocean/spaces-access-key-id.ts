import type { Credential } from '../../schema.js'

/** DigitalOcean calls this key "a public identifier for your account", so it shows in the clear. */
export const spacesAccessKeyId: Credential = {
  id: 'spaces_access_key_id',
  label: 'Spaces access key',
  names: ['SPACES_ACCESS_KEY_ID'],
  url: 'https://cloud.digitalocean.com/spaces/access_keys',
  secret: false,
  rules: [{ kind: 'length', min: 16, max: 128, message: '16 to 128 characters' }],
}
