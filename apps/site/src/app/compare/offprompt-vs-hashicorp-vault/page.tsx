import type { Metadata } from 'next'

import { Anchor } from '@/components/anchor'
import { ComparePage } from '@/components/comparison'
import { Code, LINK, Part, type Question } from '@/components/guide'
import { CHECKED, type Row, type Sources, VAULT } from '@/lib/comparisons'
import { pageMetadata } from '@/lib/metadata'
import { DOCS } from '@/lib/site'

export const metadata: Metadata = pageMetadata(VAULT)

const ROWS: readonly Row[] = [
  {
    label: 'What it is',
    offprompt: 'An MCP server the agent calls to ask you for a value it lacks, which it writes into the project',
    competitor: 'Identity-based secrets infrastructure that stores secrets and issues short-lived credentials behind an API',
  },
  {
    label: 'How a value gets in',
    offprompt: 'You type or paste it on a page served from `127.0.0.1`. The agent never handles it',
    competitor: 'You write it with `vault kv put`, or a secrets engine generates it on demand. An operator runs the server',
  },
  {
    label: 'Where values live',
    offprompt: "In the project's `.env`, `.env.local` or another file the agent names",
    competitor: "In the Vault server's encrypted storage, read through its API under a policy",
  },
  {
    label: 'Dynamic, short-lived credentials',
    offprompt: 'No. It writes a static value you already hold',
    competitor: 'Yes. Its secrets engines generate credentials on demand, each with a lease and revocation',
  },
  {
    label: 'How code reads a value',
    offprompt: 'From the file, as `process.env.NAME`',
    competitor: "Through Vault's API or CLI, or Vault Agent renders it to a file or environment variable",
  },
  {
    label: "Keeps a value out of the agent's context",
    offprompt: 'Yes. Results carry the key names, the file and a four-emoji fingerprint, never values',
    competitor:
      'Its MCP server (beta) "may expose Vault data, including secrets, to MCP clients and LLMs"; its docs say not to use it with untrusted clients or LLMs',
  },
  {
    label: 'From a cloud sandbox',
    offprompt:
      'Yes. A link through a Cloudflare quick tunnel, with values encrypted in your browser to a key only the sandbox holds',
    competitor: 'The agent needs a Vault token or an auth method wherever it runs',
  },
  {
    label: 'What it needs to run',
    offprompt: 'Nothing. A process the agent starts on your machine',
    competitor: 'A running Vault server, self-managed or HCP-managed, and an auth method',
  },
  {
    label: 'License and price',
    offprompt: 'MIT, free',
    competitor: 'BSL 1.1 since 2023: a self-managed Community Edition, plus paid Enterprise. The OpenBao fork is MPL-2.0',
  },
  {
    label: 'Aimed at',
    offprompt: 'One developer getting a key an agent needs into the project',
    competitor: 'Platforms and services needing audited, automated, short-lived secret access at scale',
  },
]

const QUESTIONS: readonly Question[] = [
  {
    question: 'Is offprompt an alternative to HashiCorp Vault?',
    answer:
      'No, and it would be a poor one. Vault is secrets infrastructure: a server that stores secrets, generates short-lived credentials, and audits every access for the services and pipelines that use it. offprompt stores nothing and generates nothing. It covers one moment a coding agent reaches: a task needs a key the project does not have, and rather than paste it into the chat, the agent asks offprompt, you type the key on a page in your browser, and it is written to the file.',
  },
  {
    question: 'Can an AI coding agent use Vault without seeing the secret?',
    answer:
      "It depends how you connect it. HashiCorp ships an official Vault MCP server, which it marks beta, and its own docs warn it “may expose Vault data, including secrets, to MCP clients and LLMs” and say not to use it with untrusted clients or LLMs. Reading a secret through that path puts the value into the agent’s context. offprompt is built for the opposite: the agent never receives the value, only the key’s name, the file and a fingerprint. Vault’s own answer to an agent using a credential without holding it is Vault Agent, which can inject or template a secret into a process outside the model’s view.",
  },
  {
    question: 'Can I use offprompt and Vault together?',
    answer:
      'Yes. Use offprompt when a brand-new key first appears, so its value never enters the chat, then store it in Vault with `vault kv put` for the team to read under a policy. Going the other way, Vault Agent can render the secrets a service needs to a file on your machine, and you can drop that file on offprompt’s page, which keeps only the keys the agent asked for — so a sandbox never holds a Vault token.',
  },
  {
    question: 'Why would I use offprompt if I already run Vault?',
    answer:
      'For the key that is not in Vault yet. When you are prototyping with a coding agent and it needs, say, a Stripe test key or a Resend key you just created, going through Vault to store it first is a detour; pasting it into the chat exposes it. offprompt is the short path: the agent asks, you type it, it lands in `.env.local`, and the value never touches the conversation. Later, move it into Vault for the team.',
  },
  {
    question: 'Does offprompt stop the agent reading the file it writes?',
    answer:
      'No. offprompt writes the key to `.env.local`, which is on disk, and it does not watch what the agent reads. Every result tells the agent not to open the file and lists the keys it holds, so the agent has no reason to. To enforce it, close the agent’s file tools to the file: a deny rule in Claude Code, `.cursorignore` in Cursor. Vault addresses this differently, by not putting the value on disk at all; the two tools make different trade-offs.',
  },
]

const SOURCES: Sources = [
  { label: 'What is Vault', href: 'https://developer.hashicorp.com/vault/docs/what-is-vault' },
  { label: 'Vault MCP server', href: 'https://developer.hashicorp.com/vault/docs/ai/mcp-server' },
  { label: 'Database secrets engine (dynamic secrets)', href: 'https://developer.hashicorp.com/vault/docs/secrets/databases' },
  { label: 'Vault Agent templates', href: 'https://developer.hashicorp.com/vault/docs/agent-and-proxy/agent/template' },
  { label: 'Vault editions', href: 'https://developer.hashicorp.com/vault/tutorials/get-started/available-editions' },
  { label: 'License change (BSL)', href: 'https://developer.hashicorp.com/vault/docs/updates/important-changes' },
  { label: 'OpenBao', href: 'https://openbao.org/' },
]

const Page = () => (
  <ComparePage
    page={VAULT}
    checked={CHECKED}
    rows={ROWS}
    questions={QUESTIONS}
    sources={SOURCES}
    lede={
      <>
        <p>
          HashiCorp Vault is secrets infrastructure. A Vault server stores secrets, hands out short-lived credentials
          that it can revoke, and audits every access, for the services, pipelines and machines that read from it.
          offprompt is a small MCP server for one moment: a coding agent hits a task that needs a key the project does
          not have, and instead of asking for it in the chat, it asks offprompt, which opens a page in your browser for
          you to type the key.
        </p>
        <p>
          One is a platform a team runs; the other is a single step a developer takes. They do not compete, and they fit
          together.
        </p>
      </>
    }
  >
    <Part title="What Vault is best at">
      <p>
        Vault&apos;s strength is credentials that do not sit still. Rather than keep a long-lived password, a service
        asks Vault for one when it needs it: its secrets engines generate database, cloud or other credentials on
        demand, each with a lease and a way to revoke it, so access is short-lived and tracked. Its transit engine does
        encryption as a service, and its PKI engine issues X.509 certificates.
      </p>
      <p>
        Around that sit many auth methods, AppRole, Kubernetes, cloud IAM and more, and Vault Agent, which authenticates
        a workload and renders secrets into files or environment variables. Vault is for an organisation that needs
        audited, automated, least-privilege access to secrets across its infrastructure. That is a different job from
        getting one key off a developer and into a project.
      </p>
    </Part>

    <Part title="When to pick Vault">
      <p>Reach for Vault, not offprompt, when:</p>
      <ul className="flex list-disc flex-col gap-2 pl-5">
        <li>services and pipelines, not people, need to read secrets automatically;</li>
        <li>you want short-lived, generated credentials with leases and revocation;</li>
        <li>you need a full audit trail of who and what read each secret;</li>
        <li>you want encryption as a service or an internal certificate authority.</li>
      </ul>
      <p>
        offprompt offers none of this. It issues nothing, audits nothing and revokes nothing; it writes a static value
        you already hold into a file, once.
      </p>
    </Part>

    <Part title="Where offprompt fits">
      <p>
        offprompt covers the key that is not in any store yet, the moment a coding agent would otherwise type it in the
        chat. The agent calls <code>collect_secret</code> with the key&apos;s name, why it needs it and the file it goes
        in; offprompt opens its page on <code>127.0.0.1</code>, you paste the key, and it writes the file and answers the
        agent with the key&apos;s name and a four-emoji fingerprint. The value is never in a prompt, a tool argument or a
        tool result.
      </p>
      <p>
        This matters next to Vault&apos;s MCP server in particular. HashiCorp&apos;s own docs warn that server, in beta,
        &ldquo;may expose Vault data, including secrets, to MCP clients and LLMs,&rdquo; and say not to point it at
        untrusted clients or models. offprompt is built so the value cannot reach the model at all.
      </p>
      <p>
        Its limit is plain: offprompt writes the key to <code>.env.local</code>, and it does not stop an agent that can
        read files from opening it. Every result tells the agent not to and lists the keys the file holds; to be sure,
        close the agent&apos;s file tools to it with a deny rule in Claude Code or <code>.cursorignore</code> in Cursor.
      </p>
    </Part>

    <Part title="Using them together">
      <p>
        Capture a new key with offprompt so its value never touches the chat, then store it in Vault for the team to
        read under a policy:
      </p>
      <Code file="Once offprompt has written the key, on your machine">
        {`vault kv put secret/acme-support RESEND_API_KEY=@.env.local   # move it into Vault, then rotate it there`}
      </Code>
      <p>
        Or start from Vault: Vault Agent can render the secrets a service needs to a file on your machine, which you drop
        on offprompt&apos;s page; offprompt keeps only the keys the agent asked for, so the sandbox holds no Vault token.
        See{' '}
        <Anchor href={`${DOCS}/guides/stores`} className={LINK}>
          Values you already keep
        </Anchor>
        .
      </p>
    </Part>
  </ComparePage>
)

export default Page
