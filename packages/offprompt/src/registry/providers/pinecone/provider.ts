import type { Provider } from '../../schema.js'
import { apiKey } from './api-key.js'

export const pinecone: Provider = {
  id: 'pinecone',
  name: 'Pinecone',
  category: 'ai',
  homepage: 'https://www.pinecone.io',
  domains: ['pinecone.io'],
  credentials: [apiKey],
  offers: [],
}
