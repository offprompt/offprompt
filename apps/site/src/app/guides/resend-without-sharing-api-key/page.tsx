import type { Metadata } from 'next'

import { Anchor } from '@/components/anchor'
import { article, GuidePage, howTo, LINK, Part, type Step, Steps } from '@/components/guide'
import { HUB, RESEND } from '@/lib/guides'
import { pageMetadata } from '@/lib/metadata'

export const metadata: Metadata = pageMetadata(RESEND)

const SEND = `
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

const { data, error } = await resend.emails.send({
  from: 'Acme <hello@updates.example.com>',
  to: ['delivered@resend.dev'],
  subject: 'It works',
  text: 'Sent with a key the agent never saw.',
})

// The SDK returns failures rather than throwing them.
if (error) {
  console.error(\`\${error.name}: \${error.message}\`)
  process.exit(1)
}

console.log(\`Sent \${data.id}\`)`

const STEPS: readonly Step[] = [
  {
    name: 'Verify a domain to send from',
    text: "In Resend's dashboard, add the domain on the Domains page. Resend recommends a subdomain named for the mail it sends, such as `updates.example.com`, rather than your root domain, so its sending reputation stays apart from your other mail. Resend then shows the DNS records to add at your DNS provider: a DKIM record at `resend._domainkey`, and SPF records on a `send` subdomain of it, a TXT and an MX for domains added before August 2026, CNAMEs for some added since. Copy them exactly as the domain's records tab shows them.",
    after:
      "A domain often verifies within 15 minutes, and DNS can take up to 72 hours. Once it does, add a DMARC record too: Resend calls it important for deliverability, and suggests starting with `v=DMARC1; p=none;`. To try Resend before then, send from `onboarding@resend.dev`, which delivers only to your Resend account's own address.",
  },
  {
    name: 'Make a key that can only send, from that domain',
    text: 'On the [API Keys page](https://resend.com/api-keys), click Create API Key and name it after the project. Choose Sending access, not Full access, and under it pick the domain from step 1. A Full access key can create, read, update and delete everything in the account, its domains and other API keys included; a sending key restricted to one domain can only send mail as that domain. Resend shows the key once, so make it when you are ready to paste it in the next step: the page offprompt opens links here too.',
  },
  {
    name: 'Let the agent ask for RESEND_API_KEY',
    text: "Ask for the task, not the key: “Send a welcome email with Resend when someone signs up.” When the agent needs the key, it calls offprompt's `collect_secret` instead of asking in the chat. A page opens in your browser on `127.0.0.1`, saying which file it will write. Paste the key there: the page checks that it starts with `re_` and is the length of a Resend key before writing it.",
    code: [
      {
        file: 'collect_secret',
        text: `
{
  "secrets": [{ "name": "RESEND_API_KEY", "provider": "resend" }],
  "reason": "The welcome email is sent with **Resend**.",
  "sink": { "kind": "dotenv", "path": ".env.local" }
}`,
      },
    ],
    after:
      'offprompt writes `RESEND_API_KEY=re_…` to `.env.local` and tells the agent the key name and four emoji, the same four the page shows. The agent never sees the value.',
  },
  {
    name: 'Send a test email',
    text: "Install Resend's Node SDK, which needs Node 20 or later, and send to `delivered@resend.dev`, one of Resend's test addresses: it reports a delivery without reaching a real inbox. Swap the `from` address for one on your verified domain.",
    code: [
      { text: 'npm install resend' },
      { file: 'send.mjs', text: SEND },
      { text: 'node --env-file=.env.local send.mjs' },
    ],
    after:
      'Node 20.6 and later load the file with `--env-file`; Next.js loads `.env.local` by itself, so a route handler or server action reads `process.env.RESEND_API_KEY` the same way. Keep the call on the server, and never give the name a `NEXT_PUBLIC_` prefix, which would put the key in the browser. When `error` is set, its message says what Resend refused, such as a `from` address on a domain that has not verified yet.',
  },
  {
    name: 'Replace the key when it may have leaked',
    text: "Resend keys do not expire. To replace one, make a new sending key as in step 2 and have the agent ask for `RESEND_API_KEY` again: offprompt's page marks the value the file already holds before replacing it. Once the app sends with the new key, remove the old one from the API Keys page, under its More options button. Removing a key revokes it at once.",
  },
]

const Resend = () => (
  <GuidePage
    guide={RESEND}
    data={[article(RESEND), howTo(RESEND, STEPS)]}
    lede={
      <p>
        Make a Resend API key with Sending access, restricted to one verified domain, and let your coding agent ask for
        it with offprompt. You paste the key on a page in your browser, it is written to <code>.env.local</code> as{' '}
        <code>RESEND_API_KEY</code>, and the code the agent writes reads it from there. The key never enters the chat,
        and if it leaks anyway, it can only send mail from that one domain.
      </p>
    }
    sources={[
      { label: 'Resend: Create an API key', href: 'https://resend.com/docs/create-an-api-key' },
      { label: 'Resend: API keys', href: 'https://resend.com/docs/dashboard/api-keys/introduction' },
      { label: 'Resend: Add a domain', href: 'https://resend.com/docs/add-a-domain' },
      { label: 'Resend: DMARC', href: 'https://resend.com/docs/dashboard/domains/dmarc' },
      { label: 'Resend: Send test emails', href: 'https://resend.com/docs/dashboard/emails/send-test-emails' },
      { label: 'Resend: Send with Node.js', href: 'https://resend.com/docs/send-with-nodejs' },
      {
        label: 'Resend: How to handle a leaked API key',
        href: 'https://resend.com/docs/knowledge-base/how-to-handle-a-leaked-api-key',
      },
      { label: 'Node.js: --env-file', href: 'https://nodejs.org/api/cli.html#--env-fileconfig' },
    ]}
  >
    <Part title="Steps">
      <Steps steps={STEPS} />
    </Part>

    <Part title="What a leaked sending key can still do">
      <p>
        Restricting the key limits the damage, but does not end it. Whoever holds a sending key for{' '}
        <code>updates.example.com</code> can send mail from that domain, which spends your quota and can hurt the
        domain&apos;s reputation with inbox providers. They cannot read the mail you have sent, add domains, or make
        keys of their own. That is the reason for a subdomain, too: a burned <code>updates.example.com</code> leaves the
        mail from <code>example.com</code> alone.
      </p>
      <p>
        One key per app and environment keeps the next leak small as well: removing the key for a staging app leaves
        production sending.
      </p>
    </Part>

    <Part title="Why not paste the key into the chat">
      <p>
        A key pasted into the agent&apos;s chat goes to the model provider with every later request, stays in the
        session&apos;s transcript, and can be copied by the agent into a file it writes.{' '}
        <Anchor href={HUB.path} className={LINK}>
          {HUB.title}
        </Anchor>{' '}
        explains what happens to it, and how offprompt keeps the agent out of the file afterwards.
      </p>
    </Part>
  </GuidePage>
)

export default Resend
