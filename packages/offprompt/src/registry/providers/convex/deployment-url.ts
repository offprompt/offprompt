import type { Credential } from '../../schema.js'

export const deploymentUrl: Credential = {
  id: 'deployment_url',
  label: 'Deployment URL',
  names: ['CONVEX_URL'],
  url: 'https://dashboard.convex.dev/deployment/settings',
  placeholder: 'https://…',
  secret: false,
  rules: [{ kind: 'format', format: 'url', message: 'a URL starting with http:// or https://' }],
}
