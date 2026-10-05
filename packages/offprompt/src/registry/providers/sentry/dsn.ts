import type { Credential } from '../../schema.js'

// A DSN only lets a client send events to one project, and Sentry says it is safe to keep public.
export const dsn: Credential = {
  id: 'dsn',
  label: 'DSN',
  names: ['SENTRY_DSN'],
  url: 'https://sentry.io/settings/projects/',
  placeholder: 'https://…',
  secret: false,
  rules: [
    { kind: 'format', format: 'url', message: 'a URL starting with http:// or https://' },
    { kind: 'charset', pattern: '^https?://[^@\\s/]+@[^\\s]+$', message: 'the key, @, then the host, as Sentry shows it' },
  ],
  example: 'https://examplePublicKey@o0.ingest.sentry.io/0',
}
