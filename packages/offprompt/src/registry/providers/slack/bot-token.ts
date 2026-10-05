import type { Credential } from '../../schema.js'

export const botToken: Credential = {
  id: 'bot_token',
  label: 'Bot token',
  names: ['SLACK_BOT_TOKEN', 'SLACK_BOT_USER_OAUTH_TOKEN'],
  url: 'https://api.slack.com/apps',
  placeholder: 'xoxb-…',
  rules: [
    { kind: 'prefix', anyOf: ['xoxb-', 'xoxe.xoxb-'], message: 'starts with xoxb- or xoxe.xoxb-' },
    { kind: 'length', min: 20, max: 512, message: 'at least 20 characters' },
  ],
}
