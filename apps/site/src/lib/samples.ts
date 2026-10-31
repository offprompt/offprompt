import { DEMO, type Sample } from 'offprompt/showcase'

import { registryEntries } from './registry'

const REASON =
  'It is adding Stripe webhook verification in `api/webhooks/stripe.ts` and deploying the handler to Vercel. It needs these to run it.'

const IN_ACME = { project: 'acme-api', asker: 'claude-code' } as const

/** The fingerprint the site's samples share, as offprompt writes one. */
export const FINGERPRINT = '🍋 🥝 🌮 🧀'

/**
 * The requests the site shows offprompt's page for. The page itself is offprompt's own,
 * rendered by its renderer, so whatever the page looks like, the site shows.
 */
export const SAMPLES = {
  /** Claude Code asks for two keys, one of them already in the file. */
  page: {
    ...IN_ACME,
    asks: [
      { name: 'STRIPE_WEBHOOK_SECRET', provider: 'stripe' },
      { name: 'VERCEL_TOKEN', provider: 'vercel' },
    ],
    reason: REASON,
    file: { kind: 'dotenv', path: '.env.local', holds: ['VERCEL_TOKEN'] },
  },
  /** The same request, as small as the page gets: its heading, where it writes, the fields and the button. */
  hero: {
    ...IN_ACME,
    asks: [
      { name: 'STRIPE_WEBHOOK_SECRET', provider: 'stripe' },
      { name: 'VERCEL_TOKEN', provider: 'vercel' },
    ],
    reason: REASON,
    file: { kind: 'dotenv', path: '.env.local', holds: ['VERCEL_TOKEN'] },
    view: 'brief',
  },
  /** The same request, with the page's paste card and footnotes left out, so its fields show. */
  opens: {
    ...IN_ACME,
    asks: [
      { name: 'STRIPE_WEBHOOK_SECRET', provider: 'stripe' },
      { name: 'VERCEL_TOKEN', provider: 'vercel' },
    ],
    reason: REASON,
    file: { kind: 'dotenv', path: '.env.local', holds: ['VERCEL_TOKEN'] },
    view: 'compact',
  },
  /** A key the file already holds, and a new one typed in to replace it. */
  overwrite: {
    ...IN_ACME,
    asks: [{ name: 'VERCEL_TOKEN', provider: 'vercel' }],
    reason: REASON,
    file: { kind: 'dotenv', path: '.env.local', holds: ['VERCEL_TOKEN'] },
    revealed: true,
    typing: { key: 'VERCEL_TOKEN', keystrokes: [{ wait: 400 }, { random: 24 }] },
    view: 'fields',
    centred: true,
  },
  /** A secret the page makes itself, in the clear, so Regenerate visibly makes another. */
  generated: {
    ...IN_ACME,
    asks: [{ name: 'JWT_SECRET', generate: { bytes: 32, encoding: 'hex' } }],
    reason: 'It signs session tokens with it.',
    file: { kind: 'dotenv', path: '.env.local', holds: [] },
    revealed: true,
    view: 'fields',
    centred: true,
  },
  /** The page once the two keys are written: the fingerprint, and the agent's side of it. */
  receipt: {
    ...IN_ACME,
    asks: [
      { name: 'STRIPE_WEBHOOK_SECRET', provider: 'stripe' },
      { name: 'VERCEL_TOKEN', provider: 'vercel' },
    ],
    reason: REASON,
    file: { kind: 'dotenv', path: '.env.local', holds: ['VERCEL_TOKEN'] },
    written: FINGERPRINT,
    view: 'fingerprint',
  },
  /** The guide on pasting a key: Claude Code asks for an OpenAI key instead of having it pasted. */
  'guide-hub': {
    project: 'acme-support',
    asker: 'claude-code',
    asks: [{ name: 'OPENAI_API_KEY', provider: 'openai' }],
    reason: 'Each new support ticket gets a short summary from **OpenAI**, written by `lib/summarise.ts`.',
    file: { kind: 'dotenv', path: '.env.local', holds: [] },
    typing: { key: 'OPENAI_API_KEY', keystrokes: [{ wait: 900 }, { type: 'sk-proj-' }, { random: 40 }, { wait: 2600 }, { erase: true }], loop: true },
    view: 'compact',
  },
  /** The same request once written: the fingerprint the agent repeats in the terminal. */
  'guide-hub-written': {
    project: 'acme-support',
    asker: 'claude-code',
    asks: [{ name: 'OPENAI_API_KEY', provider: 'openai' }],
    reason: 'Each new support ticket gets a short summary from **OpenAI**, written by `lib/summarise.ts`.',
    file: { kind: 'dotenv', path: '.env.local', holds: [] },
    written: FINGERPRINT,
    view: 'fingerprint',
  },
  /** The Resend guide: a sending key, typed in, its checks drawn as it goes. */
  'guide-resend': {
    project: 'acme-app',
    asker: 'claude-code',
    asks: [{ name: 'RESEND_API_KEY', provider: 'resend' }],
    reason: 'The welcome email in `app/api/signup/route.ts` is sent with **Resend**. A key with *Sending access*, for `updates.example.com`, is all it needs.',
    file: { kind: 'dotenv', path: '.env.local', holds: [] },
    typing: { key: 'RESEND_API_KEY', keystrokes: [{ wait: 900 }, { type: 're_' }, { random: 32 }, { wait: 2600 }, { erase: true }], loop: true },
    view: 'compact',
  },
  /** The Stripe guide: both secrets at once, and the publishable key pasted where the secret one goes. */
  'guide-stripe': {
    project: 'acme-shop',
    asker: 'claude-code',
    asks: [
      { name: 'STRIPE_SECRET_KEY', provider: 'stripe' },
      { name: 'STRIPE_WEBHOOK_SECRET', provider: 'stripe' },
    ],
    reason: 'Checkout in `server.mjs` needs a **restricted key** with Checkout Sessions: Write, and the webhook needs the `whsec_` secret `stripe listen` printed in your terminal.',
    file: { kind: 'dotenv', path: '.env.local', holds: [] },
    typing: {
      key: 'STRIPE_SECRET_KEY',
      keystrokes: [{ wait: 900 }, { type: 'pk_test_' }, { random: 40 }, { wait: 2800 }, { erase: true }, { wait: 400 }, { type: 'rk_test_' }, { random: 40 }, { wait: 2800 }, { erase: true }],
      loop: true,
    },
    view: 'compact',
  },
  /** The Supabase guide: the project URL in the clear, and a secret key whose link opens that project's keys. */
  'guide-supabase': {
    project: 'acme-admin',
    asker: 'claude-code',
    asks: [
      { name: 'SUPABASE_URL', format: 'url', secret: false },
      { name: 'SUPABASE_SECRET_KEY', provider: 'supabase', link: { project: 'abcdefghijklmnopqrst' } },
    ],
    reason: '`scripts/list-users.mjs` calls `supabase.auth.admin`, which needs a **secret key**. It runs on the server only.',
    file: { kind: 'dotenv', path: '.env.local', holds: [] },
    typing: { key: 'SUPABASE_URL', keystrokes: [{ wait: 900 }, { type: 'https://abcdefghijklmnopqrst.supabase.co' }, { wait: 3200 }, { erase: true }], loop: true },
    view: 'compact',
  },
  /** The page to try: fill it, write, and compare the four. Its request is offprompt's own demo. */
  try: DEMO,
  /**
   * A field for every provider in the registry, shown one at a time as the list beside it picks,
   * each filled with a key its checks pass, to change as you like.
   */
  schemas: {
    ...IN_ACME,
    asks: registryEntries().map(entry => entry.ask),
    reason: REASON,
    file: { kind: 'dotenv', path: '.env.local', holds: [] },
    revealed: true,
    view: 'fields',
    demo: { filled: registryEntries().map(entry => [entry.key, entry.example] as const), single: true },
  },
} satisfies Record<string, Sample>

export type SampleName = keyof typeof SAMPLES

export const isSampleName = (name: string): name is SampleName => Object.hasOwn(SAMPLES, name)
