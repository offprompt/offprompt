import { describe, expect, it } from 'vitest'

import { failures } from '../../checks.js'
import { fill } from '../../template.js'
import { projectApiKeys } from './project-page.js'
import { supabase } from './provider.js'
import { publishableKey } from './publishable-key.js'
import { secretKey } from './secret-key.js'

const JWT =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIn0.dBjftJeZ4CVPmB92K27uhbUJU1p1r_wW1gFWFOEjXk'

describe('Supabase keys', () => {
  it('accepts either shape of secret key, under one line', () => {
    expect(failures(secretKey.rules, `sb_secret_${'a'.repeat(30)}`)).toEqual([])
    expect(failures(secretKey.rules, JWT)).toEqual([])
    expect(failures(secretKey.rules, 'plain-text')).toEqual(['an sb_secret_ key, or the legacy service_role JWT'])
  })

  it('accepts either shape of publishable key', () => {
    expect(failures(publishableKey.rules, `sb_publishable_${'a'.repeat(30)}`)).toEqual([])
    expect(failures(publishableKey.rules, JWT)).toEqual([])
  })
})

describe("a Supabase key's page", () => {
  it('opens the API keys of the project the agent names, by its ref', () => {
    expect(fill({ template: projectApiKeys, values: { project: 'abcdefghijklmnopqrst' }, domains: supabase.domains })).toEqual({
      ok: true,
      value: { url: 'https://supabase.com/dashboard/project/abcdefghijklmnopqrst/settings/api-keys', ignored: [] },
    })
  })

  it('takes no local project name, such as the project_id supabase init writes', () => {
    expect(fill({ template: projectApiKeys, values: { project: 'my-app' }, domains: supabase.domains })).toEqual({
      ok: false,
      problems: ['project must be 20 lowercase letters'],
    })
  })
})
