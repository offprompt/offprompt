import type { Provider } from '../../schema.js'
import { applicationId } from './application-id.js'
import { botToken } from './bot-token.js'
import { logo } from './logo.js'
import { publicKey } from './public-key.js'

export const discord: Provider = {
  id: 'discord',
  name: 'Discord',
  category: 'messaging',
  homepage: 'https://discord.com',
  logo,
  color: '#5865F2',
  domains: ['discord.com'],
  credentials: [botToken, publicKey, applicationId],
  offers: [],
}
