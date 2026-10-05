import type { Credential } from '../../schema.js'

export const accessToken: Credential = {
  id: 'access_token',
  label: 'Access token',
  names: ['VERCEL_TOKEN', 'VERCEL_ACCESS_TOKEN'],
  url: 'https://vercel.com/account/settings/tokens',
  rules: [
    { kind: 'length', min: 24, max: 24, message: '24 characters' },
    { kind: 'charset', pattern: '^[A-Za-z0-9]*$', message: 'letters and numbers only' },
  ],
}
