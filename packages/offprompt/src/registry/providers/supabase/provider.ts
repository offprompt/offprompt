import type { Provider } from '../../schema.js'
import { logo } from './logo.js'
import { publishableKey } from './publishable-key.js'
import { secretKey } from './secret-key.js'

export const supabase: Provider = {
  id: 'supabase',
  name: 'Supabase',
  category: 'data',
  homepage: 'https://supabase.com',
  logo,
  domains: ['supabase.com', 'database.new'],
  credentials: [secretKey, publishableKey],
  offers: [{ format: 'postgres_url', url: 'https://database.new' }],
}
