import type { Credential } from '../../schema.js'

export const qstashToken: Credential = {
  id: 'qstash_token',
  label: 'QStash token',
  names: ['QSTASH_TOKEN'],
  url: 'https://console.upstash.com/qstash',
  rules: [{ kind: 'length', min: 20, max: 1024, message: 'at least 20 characters' }],
}
