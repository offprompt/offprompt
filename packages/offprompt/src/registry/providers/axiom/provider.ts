import type { Provider } from '../../schema.js'
import { apiToken } from './api-token.js'
import { dataset } from './dataset.js'

export const axiom: Provider = {
  id: 'axiom',
  name: 'Axiom',
  category: 'product',
  homepage: 'https://axiom.co',
  domains: ['axiom.co'],
  credentials: [apiToken, dataset],
  offers: [],
}
