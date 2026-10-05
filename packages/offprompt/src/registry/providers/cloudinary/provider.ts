import type { Provider } from '../../schema.js'
import { apiKey } from './api-key.js'
import { apiSecret } from './api-secret.js'
import { cloudName } from './cloud-name.js'
import { logo } from './logo.js'
import { url } from './url.js'

export const cloudinary: Provider = {
  id: 'cloudinary',
  name: 'Cloudinary',
  category: 'data',
  homepage: 'https://cloudinary.com',
  logo,
  color: '#3448C5',
  domains: ['cloudinary.com'],
  credentials: [url, cloudName, apiKey, apiSecret],
  offers: [],
}
