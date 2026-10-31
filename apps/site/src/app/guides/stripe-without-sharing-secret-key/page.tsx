import type { Metadata } from 'next'

import { Anchor } from '@/components/anchor'
import { article, GuidePage, howTo, LINK, Part, type Step, Steps } from '@/components/guide'
import { Bright, Collect, Figure, Prompt, Says, Session, Shell, Shot, Waiting, You } from '@/components/guide-shots'
import { HUB, STRIPE } from '@/lib/guides'
import { pageMetadata } from '@/lib/metadata'

export const metadata: Metadata = pageMetadata(STRIPE)

const SERVER = `
import { createServer } from 'node:http'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
const base = 'http://localhost:4242'

const checkout = async (req, res) => {
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [
      {
        price_data: { currency: 'usd', product_data: { name: 'T-shirt' }, unit_amount: 2000 },
        quantity: 1,
      },
    ],
    success_url: \`\${base}/success?session_id={CHECKOUT_SESSION_ID}\`,
    cancel_url: \`\${base}/\`,
  })
  res.writeHead(303, { Location: session.url }).end()
}

// Stripe signs the body exactly as sent, so it is read raw, never parsed first.
const webhook = async (req, res) => {
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  try {
    const event = stripe.webhooks.constructEvent(
      Buffer.concat(chunks),
      req.headers['stripe-signature'],
      process.env.STRIPE_WEBHOOK_SECRET,
    )
    if (event.type === 'checkout.session.completed') {
      console.log(\`Paid: \${event.data.object.id}\`)
    }
    res.writeHead(200).end()
  } catch (error) {
    res.writeHead(400).end(\`Webhook error: \${error.message}\`)
  }
}

createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/checkout') return checkout(req, res)
  if (req.method === 'POST' && req.url === '/webhook') return webhook(req, res)
  res.writeHead(200, { 'content-type': 'text/html' })
  res.end('<form method="post" action="/checkout"><button>Buy a T-shirt, $20</button></form>')
}).listen(4242, () => console.log(\`Open \${base}\`))`

const PROJECT = 'acme-shop'

/** Claude Code asking offprompt for both Stripe secrets in one request. */
const Asking = () => (
  <Session project={PROJECT}>
    <You>Add a Stripe Checkout button for a $20 T-shirt.</You>
    <Says>
      Checkout needs STRIPE_SECRET_KEY, and the webhook STRIPE_WEBHOOK_SECRET. Neither is in .env.local, so I&apos;ll
      ask you for both with offprompt. A restricted key with Checkout Sessions: Write is enough.
    </Says>
    <Collect>
      <span>
        file: <Bright>.env.local</Bright>
      </span>
      <span className="whitespace-pre">
        keys: <Bright>STRIPE_SECRET_KEY</Bright> <span className="hidden text-term-dim lg:inline">· stripe</span>
      </span>
      <span className="whitespace-pre">
        {'      '}
        <Bright>STRIPE_WEBHOOK_SECRET</Bright> <span className="hidden text-term-dim lg:inline">· stripe</span>
      </span>
      <span>Opened http://127.0.0.1:4123 in your browser. Waiting for you to write them…</span>
    </Collect>
    <Waiting />
  </Session>
)

/** The Stripe CLI in a terminal of your own, where the signing secret it prints stays out of the agent's session. */
const Listening = () => (
  <Figure caption="Your own terminal, not the agent's. The secret is hidden here; yours prints in full, and you paste it on offprompt's page.">
    <Shell project={PROJECT}>
      <Prompt project={PROJECT}>stripe listen --forward-to localhost:4242/webhook</Prompt>
      <span>
        &gt; Ready! Your webhook signing secret is <span className="text-term-fg">whsec_••••••••••••••••</span> (^C to
        quit)
      </span>
    </Shell>
  </Figure>
)

/** The events a test payment sends, forwarded to the local webhook and answered. */
const Paid = () => (
  <Figure caption="The same terminal after a test payment: the CLI forwards checkout.session.completed, among the other events the payment makes, and the webhook answers 200 once the signature checks out.">
    <Shell project={PROJECT}>
      <Prompt project={PROJECT}>stripe listen --forward-to localhost:4242/webhook</Prompt>
      <span>
        &gt; Ready! Your webhook signing secret is <span className="text-term-fg">whsec_••••••••••••••••</span> (^C to
        quit)
      </span>
      <span>
        2026-10-31 16:24:03 <span className="text-term-fg">--&gt; checkout.session.completed</span> [evt_1SNx…]
      </span>
      <span>
        2026-10-31 16:24:03 &lt;-- <span className="text-mint">[200]</span> POST http://localhost:4242/webhook
        [evt_1SNx…]
      </span>
    </Shell>
  </Figure>
)

const STEPS: readonly Step[] = [
  {
    name: 'Work in a sandbox',
    text: "Stripe now calls its test environments sandboxes, and the older test mode is one of them. Stripe suggests a new sandbox for a new integration, since some settings changed in test mode change live mode too. Switch to one in the Dashboard, or create one. Its keys start with `sk_test_`, `rk_test_` and `pk_test_`, and card networks don't process its payments, so nothing the agent's code does there moves real money.",
  },
  {
    name: 'Make a restricted key for Checkout',
    text: "On the sandbox's API keys page, click Create restricted key and name it after the project. Set Checkout Sessions to Write, which includes Read, and leave every other resource at None, the default. Stripe recommends restricted keys over secret keys, especially for a key given to an AI agent; this one can create Checkout Sessions and little else.",
    after:
      "If a request later fails with a permission error, add the one permission it names rather than switching to the secret key. A sandbox shows its keys again whenever you look; in live mode, a restricted key is shown once.",
  },
  {
    name: 'Start the webhook listener in your own terminal',
    picture: <Listening />,
    text: "Checkout tells your server about a payment with a `checkout.session.completed` event, which the server checks with a signing secret starting `whsec_`. For local testing, the [Stripe CLI](https://docs.stripe.com/stripe-cli) forwards events and prints that secret. Run it in a terminal of your own, not through the agent: a command the agent runs puts its output, and the secret, in the transcript.",
    code: [{ text: 'stripe listen --forward-to localhost:4242/webhook' }],
    after:
      'Leave it running. The secret it prints stays the same between restarts. A deployed endpoint has a different secret, shown under Reveal secret on the endpoint’s page in the Dashboard; choose the Snapshot payload format for the code below.',
  },
  {
    name: 'Let the agent ask for both secrets at once',
    text: "Ask for the task: “Add a Stripe Checkout button for a $20 T-shirt.” The agent calls offprompt's `collect_secret` for both values in one request, and a page opens in your browser on `127.0.0.1`. Paste the restricted key under `STRIPE_SECRET_KEY`, the name Stripe's own examples use, and the CLI's secret under `STRIPE_WEBHOOK_SECRET`.",
    code: [
      {
        file: 'collect_secret',
        text: `
{
  "secrets": [
    { "name": "STRIPE_SECRET_KEY", "provider": "stripe" },
    { "name": "STRIPE_WEBHOOK_SECRET", "provider": "stripe" }
  ],
  "reason": "Checkout needs a **Stripe** key, and the webhook its signing secret.",
  "sink": { "kind": "dotenv", "path": ".env.local" }
}`,
      },
    ],
    after:
      "The page checks each value as you paste it: the key field takes `sk_` and `rk_` keys, and says so when the publishable `pk_` key is pasted into it by mistake; the other takes only `whsec_`. offprompt writes both to `.env.local`; the agent gets their names and a four-emoji fingerprint.",
  },
  {
    name: 'Create a Checkout Session',
    text: 'A server with two routes: one creates a Checkout Session and redirects to the page Stripe hosts, the other verifies and logs the webhook. Checkout hosted by Stripe needs no publishable key, so nothing secret goes near the browser.',
    code: [{ text: 'npm install stripe' }, { file: 'server.mjs', text: SERVER }, { text: 'node --env-file=.env.local server.mjs' }],
  },
  {
    name: 'Pay with a test card',
    picture: <Paid />,
    text: 'Open `http://localhost:4242`, press the button and pay with card number `4242 4242 4242 4242`, any future expiry date and any three-digit CVC. Stripe redirects to the success URL, the CLI forwards `checkout.session.completed`, and the server logs the session ID.',
  },
]

const Stripe = () => (
  <GuidePage
    guide={STRIPE}
    data={[article(STRIPE), howTo(STRIPE, STEPS)]}
    lede={
      <p>
        Build Checkout in a Stripe sandbox, the new name for test mode, with a restricted key that can only create
        Checkout Sessions. Let your coding agent ask for it, and for the webhook signing secret, with offprompt: you
        paste both on a page in your browser, they are written to <code>.env.local</code>, and the agent writes code
        that reads <code>STRIPE_SECRET_KEY</code> and <code>STRIPE_WEBHOOK_SECRET</code> without ever seeing them.
      </p>
    }
    shot={
      <Shot
        session={<Asking />}
        sample="guide-stripe"
        height={790}
        caption="Claude Code asks offprompt for both Stripe secrets in one request, and offprompt's page for it opens in your browser. Typed into the secret key's field, a publishable pk_test_ key is caught before anything is written."
      />
    }
    sources={[
      { label: 'Stripe: API keys', href: 'https://docs.stripe.com/keys' },
      { label: 'Stripe: Restricted API keys', href: 'https://docs.stripe.com/keys/restricted-api-keys' },
      { label: 'Stripe: API key permissions', href: 'https://docs.stripe.com/keys/permissions-reference' },
      { label: 'Stripe: Best practices for managing secret API keys', href: 'https://docs.stripe.com/keys-best-practices' },
      { label: 'Stripe: Sandboxes and test mode', href: 'https://docs.stripe.com/testing-use-cases' },
      { label: 'Stripe: Testing', href: 'https://docs.stripe.com/testing' },
      { label: 'Stripe: Create a Checkout Session', href: 'https://docs.stripe.com/api/checkout/sessions/create' },
      { label: 'Stripe: Fulfill orders', href: 'https://docs.stripe.com/checkout/fulfillment' },
      { label: 'Stripe CLI: stripe listen', href: 'https://docs.stripe.com/cli/listen' },
      { label: 'stripe-node', href: 'https://github.com/stripe/stripe-node' },
    ]}
  >
    <Part title="Stripe's keys, and which ones are secret">
      <ul className="flex list-disc flex-col gap-2 pl-5">
        <li>
          <strong className="font-medium text-ink">Publishable key</strong>, <code>pk_test_</code> or{' '}
          <code>pk_live_</code>. Identifies your account to Stripe.js in the browser, and cannot create charges or
          read account data. The only Stripe key that is safe in front-end code.
        </li>
        <li>
          <strong className="font-medium text-ink">Secret key</strong>, <code>sk_test_</code> or <code>sk_live_</code>.
          Unrestricted access to every Stripe API. Stripe no longer recommends it for new uses.
        </li>
        <li>
          <strong className="font-medium text-ink">Restricted key</strong>, <code>rk_test_</code> or{' '}
          <code>rk_live_</code>. A secret key with a permission of None, Read or Write for each resource. The one to
          use here.
        </li>
        <li>
          <strong className="font-medium text-ink">Webhook signing secret</strong>, <code>whsec_</code>. Proves an
          event came from Stripe. Each endpoint has its own, and so does <code>stripe listen</code>.
        </li>
      </ul>
      <p>
        The restricted key and the signing secret both belong on the server only, and out of the agent&apos;s chat.
      </p>
    </Part>

    <Part title="Steps">
      <Steps steps={STEPS} />
    </Part>

    <Part title="Going live">
      <p>
        Make a live restricted key with the same permissions, and a webhook endpoint in live mode for your deployed
        URL, with its own signing secret. Both go in your host&apos;s environment variables for production, not in the{' '}
        <code>.env.local</code> on your machine, and neither should pass through the agent. A live restricted key is
        shown only once.
      </p>
      <p>
        If a key may have been exposed, rotate it at once, as Stripe advises even when you are unsure anyone saw it.
        On the API keys page, Rotate key makes a replacement and lets you choose when the old key expires: both work
        for up to seven days, or choose Now to delete the old one immediately. Then have the agent ask for the new key
        with offprompt, which replaces the value in <code>.env.local</code>.
      </p>
    </Part>

    <Part title="Why not paste the key into the chat">
      <p>
        Stripe&apos;s own docs say not to share keys over chat. In an agent&apos;s chat, a key goes to the model
        provider with every later request and stays in the session&apos;s transcript.{' '}
        <Anchor href={HUB.path} className={LINK}>
          {HUB.title}
        </Anchor>{' '}
        explains what happens to it, and what to do if one has already been pasted.
      </p>
    </Part>
  </GuidePage>
)

export default Stripe
