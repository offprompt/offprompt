import type { Credential } from '../../schema.js'

export const url: Credential = {
  id: 'url',
  label: 'API environment variable',
  names: ['CLOUDINARY_URL'],
  url: 'https://console.cloudinary.com/app/settings/api-keys',
  placeholder: 'cloudinary://…',
  rules: [
    { kind: 'prefix', anyOf: ['cloudinary://'], message: 'starts with cloudinary://' },
    { kind: 'length', min: 20, max: 1024, message: 'at least 20 characters' },
    {
      kind: 'charset',
      pattern: '^cloudinary://[0-9]+:[^@<>\\s]+@[^<>\\s]+$',
      message: 'the API key, a colon, the API secret, @ and the cloud name, with no <placeholders> left',
    },
  ],
  example: 'cloudinary://123456789012345:EXAMPLE0ffpr0mptK3yN0tRea1x@example-cloud',
}
