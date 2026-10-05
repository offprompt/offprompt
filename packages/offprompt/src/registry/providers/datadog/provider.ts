import type { Provider } from '../../schema.js'
import { apiKey } from './api-key.js'
import { applicationKey } from './application-key.js'
import { logo } from './logo.js'

export const datadog: Provider = {
  id: 'datadog',
  name: 'Datadog',
  category: 'product',
  homepage: 'https://www.datadoghq.com',
  logo,
  color: '#632CA6',
  domains: ['datadoghq.com'],
  credentials: [apiKey, applicationKey],
  offers: [],
}
