import type { Provider } from '../../schema.js'
import { accessKeyId } from './access-key-id.js'
import { logo } from './logo.js'
import { secretAccessKey } from './secret-access-key.js'
import { sessionToken } from './session-token.js'

export const aws: Provider = {
  id: 'aws',
  name: 'Amazon Web Services',
  category: 'deploy',
  homepage: 'https://aws.amazon.com',
  logo,
  color: '#FF9900',
  domains: ['aws.amazon.com'],
  credentials: [accessKeyId, secretAccessKey, sessionToken],
  offers: [],
}
