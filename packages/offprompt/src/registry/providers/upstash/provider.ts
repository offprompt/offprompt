import type { Provider } from '../../schema.js'
import { logo } from './logo.js'
import { qstashCurrentSigningKey } from './qstash-current-signing-key.js'
import { qstashNextSigningKey } from './qstash-next-signing-key.js'
import { qstashToken } from './qstash-token.js'
import { redisRestToken } from './redis-rest-token.js'
import { redisRestUrl } from './redis-rest-url.js'

export const upstash: Provider = {
  id: 'upstash',
  name: 'Upstash',
  category: 'data',
  homepage: 'https://upstash.com',
  logo,
  domains: ['upstash.com'],
  credentials: [redisRestUrl, redisRestToken, qstashToken, qstashCurrentSigningKey, qstashNextSigningKey],
  offers: [],
}
