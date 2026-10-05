import type { Credential } from '../../schema.js'

// pa- keys come from Voyage's own dashboard. al- keys come from MongoDB Atlas, and the
// official Python client reads them from the same variable and sends them to ai.mongodb.com.
export const apiKey: Credential = {
  id: 'api_key',
  label: 'API key',
  names: ['VOYAGE_API_KEY'],
  url: 'https://dashboard.voyageai.com/organization/api-keys',
  placeholder: 'pa-…',
  rules: [
    { kind: 'prefix', anyOf: ['pa-', 'al-'], message: 'starts with pa- or al-' },
    { kind: 'length', min: 20, max: 256, message: 'at least 20 characters' },
  ],
}
