/**
 * The one-to-one comparison pages under /compare, each setting offprompt beside one established
 * secrets tool. The three-way /compare page weighs the MCP servers; these pages are for the
 * reader who already runs, or is choosing between, a full secrets platform and wants to know
 * where a small tool like offprompt fits. Every claim about another tool says only what that
 * tool's own docs say, read on the date below, and each page lists where. Where its docs are
 * silent, the page says so rather than guessing.
 */
import type { Link } from '@/lib/site'

/** When the other tools' docs were last read for these pages. */
export const CHECKED = '9 November 2026'

/** The same date, for the pages' structured data. */
export const MODIFIED = '2026-11-09'

export type Comparison = {
  /** The last segment of the path, e.g. offprompt-vs-doppler. */
  readonly slug: string
  readonly path: string
  /** The other tool's name, as its own site writes it. */
  readonly competitor: string
  readonly title: string
  readonly description: string
  /** The title a link preview shows, where it differs from the page's own. */
  readonly share?: string
  /** The page's name in a list of links. */
  readonly label: string
  /** One line for a card or a cross-link, saying what the other tool is and where offprompt sits. */
  readonly blurb: string
}

const page = (slug: string, rest: Omit<Comparison, 'slug' | 'path'>): Comparison => ({
  slug,
  path: `/compare/${slug}`,
  ...rest,
})

export const VAULT: Comparison = page('offprompt-vs-hashicorp-vault', {
  competitor: 'HashiCorp Vault',
  title: 'offprompt vs HashiCorp Vault: API keys for a coding agent',
  description:
    'HashiCorp Vault is secrets infrastructure for running services: dynamic, short-lived credentials behind an API. offprompt hands a coding agent one key you type in your browser, kept out of the chat.',
  label: 'offprompt vs HashiCorp Vault',
  blurb:
    'Vault is identity-based secrets infrastructure that issues short-lived credentials to services. offprompt is the small step before that: getting a key a coding agent needs into the project without the chat.',
})

export const DOPPLER: Comparison = page('offprompt-vs-doppler', {
  competitor: 'Doppler',
  title: 'offprompt vs Doppler: giving a coding agent an API key',
  description:
    'Doppler is a SecretOps platform that keeps your team’s secrets in one place and injects them at runtime with doppler run. offprompt captures one key a coding agent needs, out of the chat.',
  label: 'offprompt vs Doppler',
  blurb:
    'Doppler is a hosted secrets manager that syncs one source of truth to every environment and injects it with doppler run. offprompt captures a new key an agent needs without the value reaching the chat.',
})

export const INFISICAL: Comparison = page('offprompt-vs-infisical', {
  competitor: 'Infisical',
  title: 'offprompt vs Infisical: an agent’s API key, out of the chat',
  description:
    'Infisical is an open-source secrets platform you self-host or run in the cloud, with a CLI, an MCP server and an agent proxy. offprompt is the smaller step: type a key on a page, the agent never sees it.',
  label: 'offprompt vs Infisical',
  blurb:
    'Infisical is an open-source secrets platform with a dashboard, a CLI and an MCP server. offprompt keeps no store; it gets a key the agent lacks into the project’s file without the value entering the chat.',
})

export const ONEPASSWORD: Comparison = page('offprompt-vs-1password', {
  competitor: '1Password',
  title: 'offprompt vs 1Password: giving a coding agent a secret',
  description:
    'Your team keeps secrets in 1Password and injects them with op run, from a vault it already trusts. offprompt captures a key a coding agent needs into .env.local without the value entering the chat.',
  label: 'offprompt vs 1Password',
  blurb:
    '1Password keeps your team’s secrets in a vault and injects them into commands with op run, never writing them to disk. offprompt captures a new key an agent needs without the value reaching the chat.',
})

/** The comparison pages, in the order the /compare page and the sitemap list them. */
export const COMPARISONS: readonly Comparison[] = [VAULT, DOPPLER, INFISICAL, ONEPASSWORD]

export type Row = { readonly label: string; readonly offprompt: string; readonly competitor: string }

export type Question = { readonly question: string; readonly answer: string }

/** Where a page's facts about the other tool come from. */
export type Sources = readonly Link[]
