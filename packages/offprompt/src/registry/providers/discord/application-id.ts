import type { Credential } from '../../schema.js'

/** An identifier, not a secret: Discord shows it in the clear, and it sits in the invite link of every bot. */
export const applicationId: Credential = {
  id: 'application_id',
  label: 'Application ID',
  names: ['DISCORD_APPLICATION_ID', 'DISCORD_CLIENT_ID'],
  url: 'https://discord.com/developers/applications',
  secret: false,
  rules: [
    { kind: 'length', min: 17, max: 20, message: '17 to 20 digits' },
    { kind: 'charset', pattern: '^[0-9]+$', message: 'digits only' },
  ],
}
