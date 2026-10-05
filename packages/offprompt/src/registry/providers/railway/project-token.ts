import type { Credential } from '../../schema.js'

/** Tokens are UUIDs today, which Railway does not promise, so only a floor on the length. */
export const projectToken: Credential = {
  id: 'project_token',
  label: 'Project token',
  names: ['RAILWAY_TOKEN'],
  url: 'https://docs.railway.com/integrations/api#project-token',
  rules: [{ kind: 'length', min: 32, max: 256, message: 'at least 32 characters' }],
}
