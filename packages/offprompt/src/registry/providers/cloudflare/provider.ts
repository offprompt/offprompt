import type { Provider } from '../../schema.js'
import { accountId } from './account-id.js'
import { apiToken } from './api-token.js'
import { logo } from './logo.js'
import { r2AccessKeyId } from './r2-access-key-id.js'
import { r2SecretAccessKey } from './r2-secret-access-key.js'

export const cloudflare: Provider = {
  id: 'cloudflare',
  name: 'Cloudflare',
  category: 'deploy',
  homepage: 'https://www.cloudflare.com',
  logo,
  color: '#F38020',
  domains: ['cloudflare.com'],
  credentials: [apiToken, accountId, r2AccessKeyId, r2SecretAccessKey],
  offers: [],
}
