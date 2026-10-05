import type { Provider } from '../../schema.js'
import { apiKey } from './api-key.js'
import { logo } from './logo.js'

export const elevenlabs: Provider = {
  id: 'elevenlabs',
  name: 'ElevenLabs',
  category: 'ai',
  homepage: 'https://elevenlabs.io',
  logo,
  domains: ['elevenlabs.io'],
  credentials: [apiKey],
  offers: [],
}
