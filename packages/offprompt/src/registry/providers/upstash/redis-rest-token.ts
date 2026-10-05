import type { Credential } from '../../schema.js'

export const redisRestToken: Credential = {
  id: 'redis_rest_token',
  label: 'REST token for Redis',
  names: ['UPSTASH_REDIS_REST_TOKEN', 'KV_REST_API_TOKEN'],
  url: 'https://console.upstash.com/redis',
  rules: [{ kind: 'length', min: 20, max: 512, message: 'at least 20 characters' }],
}
