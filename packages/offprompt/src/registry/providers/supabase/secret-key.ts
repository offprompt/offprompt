import type { Credential } from '../../schema.js'

export const secretKey: Credential = {
  id: 'secret_key',
  label: 'Secret key',
  names: ['SUPABASE_SECRET_KEY', 'SUPABASE_SERVICE_ROLE_KEY'],
  url: 'https://supabase.com/dashboard/project/_/settings/api-keys',
  placeholder: 'sb_secret_…',
  rules: [
    {
      kind: 'either',
      options: [
        [
          { kind: 'prefix', anyOf: ['sb_secret_'], message: 'starts with sb_secret_' },
          { kind: 'length', min: 20, max: 256, message: 'at least 20 characters' },
        ],
        [{ kind: 'format', format: 'jwt', message: 'a JWT' }],
      ],
      message: 'an sb_secret_ key, or the legacy service_role JWT',
    },
  ],
}
