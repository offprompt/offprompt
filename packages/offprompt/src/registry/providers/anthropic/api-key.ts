import type { Credential } from '../../schema.js'

export const apiKey: Credential = {
  id: 'api_key',
  label: 'API key',
  names: ['ANTHROPIC_API_KEY'],
  url: 'https://platform.claude.com/settings/keys',
  placeholder: 'sk-ant-api03-…',
  rules: [
    { kind: 'prefix', anyOf: ['sk-ant-api'], message: 'starts with sk-ant-api' },
    { kind: 'length', min: 40, max: 256, message: 'at least 40 characters' },
  ],
}
