import type { Credential } from '../../schema.js'

export const publishableKey: Credential = {
  id: 'publishable_key',
  label: 'Publishable key',
  names: ['SUPABASE_PUBLISHABLE_KEY', 'SUPABASE_ANON_KEY'],
  url: 'https://supabase.com/dashboard/project/_/settings/api-keys',
  placeholder: 'sb_publishable_…',
  secret: false,
  rules: [
    {
      kind: 'either',
      options: [
        [
          { kind: 'prefix', anyOf: ['sb_publishable_'], message: 'starts with sb_publishable_' },
          { kind: 'length', min: 20, max: 256, message: 'at least 20 characters' },
        ],
        [{ kind: 'format', format: 'jwt', message: 'a JWT' }],
      ],
      message: 'an sb_publishable_ key, or the legacy anon JWT',
    },
  ],
}
