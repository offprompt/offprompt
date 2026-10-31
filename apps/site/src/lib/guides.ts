/**
 * The guides on offprompt.dev: what happens to a key pasted into an agent's chat, and how to set
 * up one provider at a time without the agent seeing its key. Each provider's facts come from its
 * own docs, read on the date below, and each guide lists where.
 */
/** When the providers' docs were last read for the guides. */
export const CHECKED = '31 October 2026'

/** The same date, for the guides' structured data. */
export const MODIFIED = '2026-10-31'

/** A service a guide uses, by its id in offprompt's registry: an agent that asks, or a provider. */
export type Service = { readonly agent: string } | { readonly provider: string }

export type Guide = {
  readonly path: string
  readonly title: string
  /** The guide's name in a list of links, such as the footer's. */
  readonly label: string
  readonly description: string
  /** The title a link preview shows, where it differs from the page's own. */
  readonly share?: string
  /** What the guide uses, shown by their logos. */
  readonly uses: readonly Service[]
}

/** The page that lists the guides. */
export const INDEX = {
  path: '/guides',
  title: 'Guides: API keys and coding agents',
  description:
    'How to give Claude Code, Codex or Cursor the API keys a task needs without pasting them into the chat, one provider at a time: Resend, Stripe and Supabase.',
} as const

export const HUB: Guide = {
  path: '/guides/paste-api-key-into-ai-agent',
  title: 'Claude asked for my API key. Is it safe to paste it?',
  label: 'Pasting an API key into an agent',
  description:
    "A key pasted into an AI agent's chat stays in the transcript and goes to the model provider with each request. Let the agent ask for it without seeing it instead.",
  share: 'Your agent asked for an API key. Don’t paste it into the chat.',
  uses: [{ agent: 'claude-code' }, { agent: 'codex' }, { agent: 'cursor' }, { provider: 'openai' }],
}

export const RESEND: Guide = {
  path: '/guides/resend-without-sharing-api-key',
  title: 'Send email with Resend without giving your agent the API key',
  label: 'Resend API key',
  description:
    'Verify a domain, make a Resend key that can only send from it, and let your coding agent ask for RESEND_API_KEY with offprompt, so the key never enters the chat.',
  uses: [{ provider: 'resend' }],
}

export const STRIPE: Guide = {
  path: '/guides/stripe-without-sharing-secret-key',
  title: 'Take Stripe payments in test mode without your agent seeing the secret key',
  label: 'Stripe secret key',
  description:
    'Build Stripe Checkout with a coding agent while the secret key and webhook signing secret stay out of the chat: test keys, restricted keys and offprompt.',
  uses: [{ provider: 'stripe' }],
}

export const SUPABASE: Guide = {
  path: '/guides/supabase-without-leaking-service-role-key',
  title: 'Use Supabase with a coding agent without leaking the service_role key',
  label: 'Supabase service_role key',
  description:
    "Supabase's service_role and secret keys bypass Row Level Security. Keep them out of the agent's chat and the browser, and use them only in server code.",
  uses: [{ provider: 'supabase' }],
}

/** The provider guides, in the order the hub lists them. */
export const PROVIDER_GUIDES: readonly Guide[] = [RESEND, STRIPE, SUPABASE]

export const GUIDE_PAGES: readonly Guide[] = [HUB, ...PROVIDER_GUIDES]
