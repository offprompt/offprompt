import type { Credential } from '../../schema.js'

export const apiSecret: Credential = {
  id: 'api_secret',
  label: 'API secret',
  names: ['CLOUDINARY_API_SECRET'],
  url: 'https://console.cloudinary.com/app/settings/api-keys',
  rules: [{ kind: 'length', min: 20, max: 64, message: '20 to 64 characters' }],
}
