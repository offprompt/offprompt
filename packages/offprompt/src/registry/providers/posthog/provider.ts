import type { Provider } from '../../schema.js'
import { logo } from './logo.js'
import { personalApiKey } from './personal-api-key.js'
import { projectToken } from './project-token.js'

export const posthog: Provider = {
  id: 'posthog',
  name: 'PostHog',
  category: 'product',
  homepage: 'https://posthog.com',
  logo,
  domains: ['posthog.com'],
  credentials: [projectToken, personalApiKey],
  offers: [],
}
