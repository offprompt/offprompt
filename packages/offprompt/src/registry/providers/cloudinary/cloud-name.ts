import type { Credential } from '../../schema.js'

export const cloudName: Credential = {
  id: 'cloud_name',
  label: 'Cloud name',
  names: ['CLOUDINARY_CLOUD_NAME'],
  url: 'https://console.cloudinary.com/app/settings/api-keys',
  secret: false,
  rules: [
    { kind: 'length', min: 2, max: 128, message: '2 to 128 characters' },
    { kind: 'charset', pattern: '^[A-Za-z0-9_-]+$', message: 'letters, numbers, - or _ only' },
  ],
}
