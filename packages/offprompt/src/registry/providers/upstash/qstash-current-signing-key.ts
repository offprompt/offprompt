import type { Credential } from '../../schema.js'

export const qstashCurrentSigningKey: Credential = {
  id: 'qstash_current_signing_key',
  label: 'QStash current signing key',
  names: ['QSTASH_CURRENT_SIGNING_KEY'],
  url: 'https://console.upstash.com/qstash',
  placeholder: 'sig_…',
  rules: [
    { kind: 'prefix', anyOf: ['sig_'], message: 'starts with sig_' },
    { kind: 'length', min: 20, max: 256, message: 'at least 20 characters' },
  ],
}
