import type { Provider } from '../../schema.js'
import { serviceToken } from './service-token.js'

export const doppler: Provider = {
  id: 'doppler',
  name: 'Doppler',
  category: 'stores',
  homepage: 'https://www.doppler.com',
  domains: ['doppler.com'],
  credentials: [serviceToken],
  offers: [],
}
