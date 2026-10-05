import type { Provider } from '../../schema.js'
import { apiToken } from './api-token.js'
import { logo } from './logo.js'
import { projectToken } from './project-token.js'

export const railway: Provider = {
  id: 'railway',
  name: 'Railway',
  category: 'deploy',
  homepage: 'https://railway.com',
  logo,
  domains: ['railway.com'],
  credentials: [projectToken, apiToken],
  offers: [],
}
