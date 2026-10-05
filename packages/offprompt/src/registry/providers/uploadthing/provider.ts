import type { Provider } from '../../schema.js'
import { token } from './token.js'

// No logo.ts: neither Simple Icons nor lobe-icons has UploadThing, and none is drawn here.
export const uploadthing: Provider = {
  id: 'uploadthing',
  name: 'UploadThing',
  category: 'data',
  homepage: 'https://uploadthing.com',
  domains: ['uploadthing.com'],
  credentials: [token],
  offers: [],
}
