import type { Credential } from '../../schema.js'

export const apiKey: Credential = {
  id: 'api_key',
  label: 'API key',
  names: ['CLOUDINARY_API_KEY'],
  url: 'https://console.cloudinary.com/app/settings/api-keys',
  secret: false,
  rules: [
    { kind: 'length', min: 8, max: 24, message: '8 to 24 characters' },
    { kind: 'charset', pattern: '^[0-9]+$', message: 'digits only' },
  ],
}
