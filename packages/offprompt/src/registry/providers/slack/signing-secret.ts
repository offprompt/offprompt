import type { Credential } from '../../schema.js'

export const signingSecret: Credential = {
  id: 'signing_secret',
  label: 'Signing secret',
  names: ['SLACK_SIGNING_SECRET'],
  url: 'https://api.slack.com/apps',
  rules: [{ kind: 'length', min: 20, max: 48, message: '20 to 48 characters' }],
}
