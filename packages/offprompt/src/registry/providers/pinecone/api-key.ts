import type { Credential } from '../../schema.js'

// Pinecone's docs name two prefixes, pcsk_ in its CLI and SDK examples and pckey_ in the
// Admin API reference, so both are accepted. The UUID form is the older kind of key.
export const apiKey: Credential = {
  id: 'api_key',
  label: 'API key',
  names: ['PINECONE_API_KEY'],
  url: 'https://app.pinecone.io/organizations/-/projects/-/keys',
  placeholder: 'pcsk_…',
  rules: [
    {
      kind: 'either',
      options: [
        [
          { kind: 'prefix', anyOf: ['pcsk_', 'pckey_'], message: 'starts with pcsk_ or pckey_' },
          { kind: 'length', min: 40, max: 256, message: 'at least 40 characters' },
        ],
        [{ kind: 'format', format: 'uuid', message: 'a UUID' }],
      ],
      message: 'a pcsk_ or pckey_ key, or an older UUID key',
    },
  ],
}
