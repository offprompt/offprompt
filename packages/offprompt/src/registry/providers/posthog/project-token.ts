import type { Credential } from '../../schema.js'

// PostHog's docs say this token is meant to be public: it can only send events and evaluate flags,
// and its own guides ship it in browser code. They also use POSTHOG_API_KEY for it in some
// server SDKs and for the personal key in others, so that name is left to neither.
export const projectToken: Credential = {
  id: 'project_token',
  label: 'Project token',
  names: ['POSTHOG_PROJECT_TOKEN', 'POSTHOG_KEY'],
  url: 'https://us.posthog.com/settings/project#variables',
  placeholder: 'phc_…',
  secret: false,
  rules: [
    { kind: 'prefix', anyOf: ['phc_'], message: 'starts with phc_' },
    { kind: 'length', min: 40, max: 256, message: 'at least 40 characters' },
  ],
}
