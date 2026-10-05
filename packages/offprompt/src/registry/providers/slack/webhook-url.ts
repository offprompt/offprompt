import type { Credential } from '../../schema.js'

/** A secret even though it is a URL: anyone who has it can post to the channel. */
export const webhookUrl: Credential = {
  id: 'webhook_url',
  label: 'Incoming webhook URL',
  names: ['SLACK_WEBHOOK_URL'],
  url: 'https://api.slack.com/apps',
  placeholder: 'https://hooks.slack.com/services/…',
  rules: [
    { kind: 'prefix', anyOf: ['https://hooks.slack.com/'], message: 'starts with https://hooks.slack.com/' },
    { kind: 'length', min: 40, max: 512, message: 'at least 40 characters' },
  ],
}
