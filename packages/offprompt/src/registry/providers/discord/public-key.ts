import type { Credential } from '../../schema.js'

/** Meant to be public: it is the key apps verify Discord's signed HTTP requests with, shown in the clear on the General Information page. */
export const publicKey: Credential = {
  id: 'public_key',
  label: 'Public key',
  names: ['DISCORD_PUBLIC_KEY'],
  url: 'https://discord.com/developers/applications',
  secret: false,
  rules: [
    { kind: 'length', min: 64, max: 64, message: '64 characters' },
    { kind: 'charset', pattern: '^[0-9a-fA-F]+$', message: 'hexadecimal characters only, 0-9 and a-f' },
  ],
}
