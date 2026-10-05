import type { Credential } from '../../schema.js'

export const userAccessToken: Credential = {
  id: 'user_access_token',
  label: 'User access token',
  names: ['HF_TOKEN', 'HUGGING_FACE_HUB_TOKEN', 'HUGGINGFACEHUB_API_TOKEN', 'HUGGINGFACE_API_KEY'],
  url: 'https://huggingface.co/settings/tokens',
  placeholder: 'hf_…',
  rules: [
    { kind: 'prefix', anyOf: ['hf_'], message: 'starts with hf_' },
    { kind: 'length', min: 30, max: 256, message: 'at least 30 characters' },
  ],
}
