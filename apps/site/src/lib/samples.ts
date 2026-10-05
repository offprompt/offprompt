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
  },
  /** A secret the page makes itself, in the clear, so Regenerate visibly makes another. */
  generated: {
    ...IN_ACME,
    asks: [{ name: 'JWT_SECRET', generate: { bytes: 32, encoding: 'hex' } }],
    reason: 'It signs session tokens with it.',
    file: { kind: 'dotenv', path: '.env.local', holds: [] },
    revealed: true,
    view: 'fields',
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
