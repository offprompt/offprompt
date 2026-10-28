import { describe, expect, it } from 'vitest'

import { linkFor, type AskedLink } from '../src/mcp/links.js'
import { valueFor, type Ask } from '../src/mcp/resolve.js'

const REF = 'abcdefghijklmnopqrst'

const linkOf = ({ link, ...ask }: Ask & { link: AskedLink }) => {
  const value = valueFor(ask)
  if (!value.ok) throw new Error(value.message)
  return linkFor({ name: ask.name, link, value: value.value })
}

describe('a link of parameters', () => {
  it("fills the key's page in the registry", () => {
    expect(linkOf({ name: 'SUPABASE_SECRET_KEY', provider: 'supabase', link: { project: REF } })).toEqual({
      kind: 'filled',
      url: `https://supabase.com/dashboard/project/${REF}/settings/api-keys`,
      ignored: [],
    })
  })

  it('fills the page of a key recognised by its name alone', () => {
    expect(linkOf({ name: 'SUPABASE_PUBLISHABLE_KEY', link: { project: REF } })).toMatchObject({ kind: 'filled' })
  })

  it('is dropped, with why and where Get it goes instead, when a parameter does not fit', () => {
    expect(linkOf({ name: 'SUPABASE_SECRET_KEY', provider: 'supabase', link: { project: 'my-app' } })).toEqual({
      kind: 'dropped',
      why: 'project must be 20 lowercase letters, so Get it opens supabase.com/dashboard/project/_/settings/api-keys instead',
    })
    expect(linkOf({ name: 'SUPABASE_SECRET_KEY', provider: 'supabase', link: { ref: REF } })).toEqual({
      kind: 'dropped',
      why: 'project is missing, so Get it opens supabase.com/dashboard/project/_/settings/api-keys instead',
    })
  })

  it('is dropped for a key whose page is the same for everyone', () => {
    expect(linkOf({ name: 'RESEND_API_KEY', provider: 'resend', link: { team: 'acme' } })).toEqual({
      kind: 'dropped',
      why: "Resend's API key has one page for everyone, resend.com/api-keys, which takes no parameters",
    })
  })

  it('is dropped for a key no provider issues, which takes an address instead', () => {
    expect(linkOf({ name: 'VAULT_TOKEN', link: { org: 'acme' } })).toEqual({
      kind: 'dropped',
      why: "VAULT_TOKEN is not a provider's key, so there is no page for parameters to fill; give the https address where it is made instead",
    })
  })
})

describe('a link of its own', () => {
  it('is kept as the agent’s suggestion, with its whole host', () => {
    expect(linkOf({ name: 'VAULT_TOKEN', link: 'https://vault.acme.internal:8200/ui/tokens/new' })).toEqual({
      kind: 'suggested',
      url: 'https://vault.acme.internal:8200/ui/tokens/new',
      host: 'vault.acme.internal:8200',
    })
  })

  it('stays a suggestion on a provider key, beside its Get it, even on the provider’s own domain', () => {
    expect(linkOf({ name: 'STRIPE_SECRET_KEY', provider: 'stripe', link: 'https://dashboard.stripe.com/test/apikeys' })).toEqual({
      kind: 'suggested',
      url: 'https://dashboard.stripe.com/test/apikeys',
      host: 'dashboard.stripe.com',
    })
  })

  it('shows a host spelt in other scripts as the browser resolves it, so a lookalike shows', () => {
    expect(linkOf({ name: 'VAULT_TOKEN', link: 'https://gіthub.com/settings/tokens' })).toMatchObject({
      kind: 'suggested',
      host: 'xn--gthub-n2e.com',
    })
  })

  it('is dropped unless it is https', () => {
    const why = (link: string) => {
      const outcome = linkOf({ name: 'VAULT_TOKEN', link })
      return outcome?.kind === 'dropped' ? outcome.why : outcome?.kind
    }
    expect(why('http://vault.acme.internal/')).toBe('the link is not https, and the page only shows https links')
    expect(why('javascript:alert(1)')).toBe('the link is not https, and the page only shows https links')
    expect(why('data:text/html,<b>hi</b>')).toBe('the link is not https, and the page only shows https links')
    expect(why('vault.acme.internal/tokens')).toBe('the link is not an address')
  })

  it('is dropped when it names a user before its host, which reads as somewhere it is not', () => {
    expect(linkOf({ name: 'VAULT_TOKEN', link: 'https://github.com@lookalike.example/settings/tokens' })).toEqual({
      kind: 'dropped',
      why: 'the link names a user or a password before its host, which hides where it goes',
    })
  })
})

it('has nothing to link to for a generated value', () => {
  expect(linkOf({ name: 'AUTH_SECRET', generate: { bytes: 32, encoding: 'base64url' }, link: 'https://example.com/' })).toEqual({
    kind: 'dropped',
    why: 'AUTH_SECRET is generated on the page, so there is nothing to get',
  })
})
