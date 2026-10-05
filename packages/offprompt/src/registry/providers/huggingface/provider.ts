import type { Provider } from '../../schema.js'
import { logo } from './logo.js'
import { userAccessToken } from './user-access-token.js'

export const huggingface: Provider = {
  id: 'huggingface',
  name: 'Hugging Face',
  category: 'ai',
  homepage: 'https://huggingface.co',
  logo,
  domains: ['huggingface.co'],
  credentials: [userAccessToken],
  offers: [],
}
