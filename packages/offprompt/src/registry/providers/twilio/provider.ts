import type { Provider } from '../../schema.js'
import { accountSid } from './account-sid.js'
import { apiKeySecret } from './api-key-secret.js'
import { apiKeySid } from './api-key-sid.js'
import { authToken } from './auth-token.js'

export const twilio: Provider = {
  id: 'twilio',
  name: 'Twilio',
  category: 'messaging',
  homepage: 'https://www.twilio.com',
  domains: ['twilio.com'],
  credentials: [accountSid, authToken, apiKeySid, apiKeySecret],
  offers: [],
}
