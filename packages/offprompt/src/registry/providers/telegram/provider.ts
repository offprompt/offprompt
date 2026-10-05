import type { Provider } from '../../schema.js'
import { botToken } from './bot-token.js'
import { logo } from './logo.js'

export const telegram: Provider = {
  id: 'telegram',
  name: 'Telegram',
  category: 'messaging',
  homepage: 'https://telegram.org',
  logo,
  color: '#26A5E4',
  domains: ['telegram.org', 't.me'],
  credentials: [botToken],
  offers: [],
}
