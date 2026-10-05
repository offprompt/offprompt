import type { Provider } from '../../schema.js'
import { accessToken } from './access-token.js'

// No logo: neither Simple Icons nor lobe-icons has the Polar mark, so none is drawn here.
export const polar: Provider = {
  id: 'polar',
  name: 'Polar',
  category: 'payments',
  homepage: 'https://polar.sh',
  domains: ['polar.sh'],
  credentials: [accessToken],
  offers: [],
}
