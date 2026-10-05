import type { Credential } from '../../schema.js'

export const token: Credential = {
  id: 'token',
  label: 'Token',
  names: ['UPLOADTHING_TOKEN'],
  url: 'https://uploadthing.com/dashboard',
  placeholder: 'eyJ…',
  rules: [
    { kind: 'length', min: 40, max: 4096, message: 'at least 40 characters' },
    { kind: 'charset', pattern: '^[A-Za-z0-9+/]+={0,2}$', message: 'base64 characters only' },
  ],
}
