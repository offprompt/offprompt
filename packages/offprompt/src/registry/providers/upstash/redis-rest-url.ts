import type { Credential } from '../../schema.js'

export const redisRestUrl: Credential = {
  id: 'redis_rest_url',
  label: 'REST URL for Redis',
  names: ['UPSTASH_REDIS_REST_URL', 'KV_REST_API_URL'],
  url: 'https://console.upstash.com/redis',
  placeholder: 'https://…',
  secret: false,
  rules: [{ kind: 'format', format: 'url', message: 'a URL starting with http:// or https://' }],
}
