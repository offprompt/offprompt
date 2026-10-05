import { describe, expect, it } from 'vitest'

import type { TypedValue } from '../src/core/store.js'
import { valueFor, type Ask } from '../src/mcp/resolve.js'
import { referenceOf, sourceByReference } from '../src/registry/registry.js'

const typed = (ask: Ask): TypedValue => {
  const value = valueFor(ask)
  if (!value.ok) throw new Error(value.message)
  if (value.value.kind !== 'typed') throw new Error('expected a typed value')
  return value.value
}

describe('what the agent asks for', () => {
  it('generates a value when asked to', () => {
    expect(valueFor({ name: 'AUTH_SECRET', generate: { bytes: 32, encoding: 'hex' } })).toEqual({
      ok: true,
      value: { kind: 'generated', bytes: 32, encoding: 'hex' },
    })
  })

  it('picks the provider key the name stands for', () => {
    expect(typed({ name: 'STRIPE_WEBHOOK_SECRET', provider: 'stripe' }).source).toBe(sourceByReference('stripe/webhook_secret'))
  })

  it('takes a provider that issues one key, whatever the name', () => {
    expect(typed({ name: 'MAIL_KEY', provider: 'resend' }).source).toBe(sourceByReference('resend/api_key'))
  })

  it('takes a key by reference, whatever the name', () => {
    expect(typed({ name: 'PAYMENTS_PK', provider: 'stripe/publishable_key' }).source).toBe(
      sourceByReference('stripe/publishable_key'),
    )
  })

  it('asks the agent which key when the name does not say', () => {
    const value = valueFor({ name: 'PAYMENTS_KEY', provider: 'stripe' })
    expect(value.ok).toBe(false)
    expect(value.ok ? '' : value.message).toContain('stripe/secret_key, stripe/publishable_key, stripe/webhook_secret')
  })

  it('refuses more than one way to make the same value', () => {
    const value = valueFor({ name: 'A_KEY', provider: 'resend', format: 'text' })
    expect(value).toEqual({ ok: false, message: 'A_KEY: give at most one of generate, provider and format' })
  })

  it('offers the providers that can create a value of a format', () => {
    const value = typed({ name: 'DATABASE_URL', format: 'postgres_url' })
    expect(value.offers.map(offer => offer.provider.name)).toEqual(['Neon', 'PlanetScale', 'Supabase'])
    expect(value.label).toBe('Postgres connection string')
    expect(value.source).toBeUndefined()
  })

  it('recognises a provider key by its usual name, framework prefix and all', () => {
    const source = typed({ name: 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY' }).source
    expect(source === undefined ? '' : referenceOf(source)).toBe('stripe/publishable_key')
  })

  it('recognises a name behind two framework prefixes', () => {
    const source = typed({ name: 'VITE_PUBLIC_POSTHOG_KEY' }).source
    expect(source === undefined ? '' : referenceOf(source)).toBe('posthog/project_token')
  })

  it('takes any other name as plain text, masked', () => {
    expect(typed({ name: 'SOME_TOKEN' })).toMatchObject({ rules: [], masked: true, offers: [] })
  })

  it('does not guess a provider when the agent named a format', () => {
    expect(typed({ name: 'OPENAI_API_KEY', format: 'text' }).source).toBeUndefined()
  })

  it('shows a value in the clear when it is not secret, or the provider says so', () => {
    expect(typed({ name: 'MAX_RETRIES', format: 'integer', secret: false }).masked).toBe(false)
    expect(typed({ name: 'STRIPE_PUBLISHABLE_KEY' }).masked).toBe(false)
    expect(typed({ name: 'STRIPE_PUBLISHABLE_KEY', secret: true }).masked).toBe(true)
  })

  it('never masks a multi-line value, which is read back before it is written', () => {
    expect(typed({ name: 'SIGNING_KEY', format: 'pem' })).toMatchObject({ multiline: true, masked: false })
  })
})
