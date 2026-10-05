import type { Credential } from '../../schema.js'

export const botToken: Credential = {
  id: 'bot_token',
  label: 'Bot token',
  names: ['DISCORD_TOKEN', 'DISCORD_BOT_TOKEN'],
  url: 'https://discord.com/developers/applications',
  rules: [{ kind: 'length', min: 50, max: 100, message: '50 to 100 characters' }],
}
