import type { Credential } from '../../schema.js'

export const botToken: Credential = {
  id: 'bot_token',
  label: 'Bot token',
  names: ['TELEGRAM_BOT_TOKEN', 'TELEGRAM_TOKEN'],
  url: 'https://t.me/BotFather',
  placeholder: '123456789:…',
  rules: [
    {
      kind: 'charset',
      pattern: '^[0-9]+:[A-Za-z0-9_-]+$',
      message: 'the bot id, a colon, then letters, numbers, - and _',
    },
    { kind: 'length', min: 30, max: 100, message: '30 to 100 characters' },
  ],
  example: '123456789:EXAMPLE0ffpr0mptK3yN0tRea1x9K2mQ7',
}
