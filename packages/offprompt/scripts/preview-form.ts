import { resolve } from 'node:path'

import { resolveSink } from '../src/core/sinks.js'
import { createRequestStore } from '../src/core/store.js'
import { requestedSecrets, type AskedSecret } from '../src/mcp/requested.js'
import { askerFor } from '../src/registry/clients.js'
import { startLoopbackServer } from '../src/web/server.js'

/** Boots one loopback server with sample requests so the form can be looked at. */
const main = async () => {
  // Where `pnpm preview` was typed, since pnpm runs the script from this package.
  const root = resolve(process.env.INIT_CWD ?? process.cwd(), process.argv[2] ?? '.')
  const store = createRequestStore()
  const asker = askerFor({ clientInfo: { name: 'claude-code' } })
  const server = await startLoopbackServer({ store })

  const open = async ({
    asks,
    reason,
    path,
    kind,
  }: {
    asks: readonly AskedSecret[]
    reason: string
    path: string
    kind: 'dotenv' | 'file'
  }) => {
    const sink = await resolveSink({ root, spec: { kind, path } })
    if (!sink.ok) throw new Error(sink.message)
    const secrets = await requestedSecrets({ sink: sink.value, asks })
    if (!secrets.ok) throw new Error(secrets.message)
    return server.urlFor(
      store.create({ secrets: secrets.value, reason, sink: sink.value, ...(asker === undefined ? {} : { asker }) }),
    )
  }

  const urls = await Promise.all([
    open({
      asks: [
        { name: 'STRIPE_WEBHOOK_SECRET', provider: 'stripe' },
        { name: 'VERCEL_TOKEN', provider: 'vercel' },
        { name: 'DATABASE_URL', format: 'postgres_url' },
        { name: 'JWT_SECRET', generate: { bytes: 32, encoding: 'hex' } },
        { name: 'ACME_PARTNER_KEY' },
      ],
      reason:
        'It is adding Stripe webhook verification in `api/webhooks/stripe.ts`, signing sessions, and deploying the handler to Vercel. It needs these to run it.',
      path: '.env.local',
      kind: 'dotenv',
    }),
    open({
      asks: [{ name: 'RESEND_API_KEY', provider: 'resend' }],
      reason: 'The email sender reads it via dotenv at startup, so transactional mail can go out.',
      path: '.env',
      kind: 'dotenv',
    }),
    open({
      asks: [
        { name: 'STRIPE_SECRET_KEY', provider: 'stripe', caption: 'Use the test mode key for now' },
        { name: 'STRIPE_PUBLISHABLE_KEY', provider: 'stripe' },
      ],
      reason:
        'Checkout needs **both** Stripe keys:\n\n- the `secret` key signs server requests\n- the *publishable* key runs in the browser\n\nUse the **test mode** keys for now. Find them at [the dashboard](https://dashboard.stripe.com/test/apikeys).',
      path: '.env',
      kind: 'dotenv',
    }),
    open({
      asks: [
        { name: 'DATABASE_URL', format: 'postgres_url' },
        { name: 'OPENAI_API_KEY' },
        { name: 'AUTH_SECRET', generate: { bytes: 32, encoding: 'base64url' } },
        { name: 'MAX_RETRIES', format: 'integer', secret: false },
      ],
      reason: 'The app needs a database, a model key and a session secret before it can start.',
      path: '.env',
      kind: 'dotenv',
    }),
    open({
      asks: [{ name: 'GITHUB_APP_PRIVATE_KEY', format: 'pem' }],
      reason: 'The webhook handler signs its installation tokens with it.',
      path: 'secrets/github-app.pem',
      kind: 'file',
    }),
  ])

  process.stdout.write(`${urls.join('\n')}\n`)
}

await main()
