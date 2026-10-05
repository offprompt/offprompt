import type { Provider } from '../../schema.js'
import { botToken } from './bot-token.js'
import { signingSecret } from './signing-secret.js'
import { webhookUrl } from './webhook-url.js'

export const slack: Provider = {
  id: 'slack',
  name: 'Slack',
  category: 'messaging',
  homepage: 'https://slack.com',
  domains: ['slack.com'],
  credentials: [botToken, signingSecret, webhookUrl],
  offers: [],
}
