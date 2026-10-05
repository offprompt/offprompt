import type { Credential } from '../../schema.js'

// Current keys start with tgp_v1_, but Together's docs also keep a deprecated legacy key
// with no prefix, so only the length is checked.
export const apiKey: Credential = {
  id: 'api_key',
  label: 'API key',
  names: ['TOGETHER_API_KEY', 'TOGETHER_AI_API_KEY'],
  url: 'https://api.together.ai/settings/projects/~current/api-keys',
  placeholder: 'tgp_v1_…',
  rules: [{ kind: 'length', min: 40, max: 256, message: 'at least 40 characters' }],
}
