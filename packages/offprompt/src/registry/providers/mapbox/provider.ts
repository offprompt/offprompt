import type { Provider } from '../../schema.js'
import { logo } from './logo.js'
import { publicToken } from './public-token.js'
import { secretToken } from './secret-token.js'

export const mapbox: Provider = {
  id: 'mapbox',
  name: 'Mapbox',
  category: 'product',
  homepage: 'https://www.mapbox.com',
  logo,
  domains: ['mapbox.com'],
  credentials: [publicToken, secretToken],
  offers: [],
}
