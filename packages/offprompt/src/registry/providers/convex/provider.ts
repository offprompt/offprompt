import type { Provider } from '../../schema.js'
import { deployKey } from './deploy-key.js'
import { deploymentUrl } from './deployment-url.js'
import { logo } from './logo.js'

export const convex: Provider = {
  id: 'convex',
  name: 'Convex',
  category: 'data',
  homepage: 'https://www.convex.dev',
  logo,
  color: '#EE342F',
  domains: ['convex.dev'],
  credentials: [deployKey, deploymentUrl],
  offers: [],
}
