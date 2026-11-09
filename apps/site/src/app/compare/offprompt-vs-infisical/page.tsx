import type { Metadata } from 'next'

import { Anchor } from '@/components/anchor'
import { ComparePage } from '@/components/comparison'
import { Code, LINK, Part, type Question, Rich } from '@/components/guide'
import { CHECKED, INFISICAL, type Row, type Sources } from '@/lib/comparisons'
import { pageMetadata } from '@/lib/metadata'
import { COMPARE, DOCS } from '@/lib/site'

export const metadata: Metadata = pageMetadata(INFISICAL)

const ROWS: readonly Row[] = [
  {
    label: 'What it is',
    offprompt: 'An MCP server the agent calls to ask you for a value it lacks, which it writes into the project',
    competitor: 'An open-source secrets platform you self-host or run in the cloud, with a dashboard, a CLI and an MCP server',
  },
  {
    label: 'How a value gets in',
    offprompt: 'You type or paste it on a page served from `127.0.0.1`. The agent never handles it',
    competitor: 'You add it in the dashboard, the CLI or the API. A new value does not come from the task at hand',
  },
  {
    label: 'Where values live',
    offprompt: "In the project's `.env`, `.env.local` or another file the agent names",
    competitor: 'In Infisical Cloud or a self-hosted Infisical, read under a machine identity',
  },
  {
    label: 'How code reads a value',
    offprompt: 'From the file, as `process.env.NAME`',
    competitor: '`infisical run -- <cmd>` injects secrets as environment variables, or `infisical export` writes a `.env`',
  },
  {
    label: "Keeps a value out of the agent's context",
    offprompt: 'Yes. Results carry the key names, the file and a four-emoji fingerprint, never values',
    competitor: 'Its MCP server returns values from `get-secret` and `list-secrets` by default; `INFISICAL_MASK_SECRET_VALUES=true` masks them',
  },
  {
    label: "Checks a key's format",
    offprompt: 'Yes, against a registry of 65 providers and 111 kinds of key, such as a prefix and a length',
    competitor: 'Yes, against rules your project sets, such as a length, a regex or a prefix, checked on every write',
  },
  {
    label: 'Self-hostable',
    offprompt: 'Runs on your machine; there is nothing to host',
    competitor: 'Yes, via Docker, Docker Compose or Kubernetes; or use Infisical Cloud',
  },
  {
    label: 'An agent using a key it never sees',
    offprompt: 'The value never reaches the agent in the first place',
    competitor: "Agent Vault (preview): a proxy that adds the real credential to an agent's requests, so the agent never holds it",
  },
  {
    label: 'Account needed',
    offprompt: 'None',
    competitor: 'An Infisical account or your own instance, with a machine identity',
  },
  {
    label: 'License and price',
    offprompt: 'MIT, free',
    competitor: 'Core is MIT, with an `ee/` enterprise-licensed part. A free plan and paid plans',
  },
]

const QUESTIONS: readonly Question[] = [
  {
    question: 'Is offprompt an alternative to Infisical?',
    answer:
      'No. Infisical is a place to keep a team’s secrets, self-hosted or in its cloud, with a dashboard, versioning, a CLI and more. offprompt keeps no store. It is for the moment a task needs a key the project does not have yet: the agent asks for it by name, you type it on a page in your browser, offprompt writes it to the file, and the agent learns only that the key exists. Once a key exists, Infisical is a good place to keep it.',
  },
  {
    question: "Does Infisical's MCP server keep secret values out of the agent's context?",
    answer:
      'By default its MCP server returns secret values from `get-secret` and `list-secrets`, so reading one through the agent puts the value into its context. Since version 0.0.24 you can set `INFISICAL_MASK_SECRET_VALUES=true` to replace them with `<masked>`, and restrict which tools are exposed. offprompt takes the question out of configuration: its results never carry a value, only the key’s name and a fingerprint. For the side-by-side of the MCP servers, see the three-way comparison linked below.',
  },
  {
    question: 'Can I use offprompt and Infisical together?',
    answer:
      'Yes. Capture a new key with offprompt so its value never enters the chat, then add it to Infisical to share, version and rotate across the team. The other way, `infisical export --format=dotenv` writes a file on your laptop that you drop on offprompt’s page, which keeps only the keys the agent asked for, so a sandbox never needs an Infisical machine identity.',
  },
  {
    question: "How is offprompt's key checking different from Infisical's validation rules?",
    answer:
      'They check at different times, against different things. Infisical checks a value as it is written against rules your project sets, such as a minimum length, a regex or a required prefix. offprompt checks a value as you type it against a built-in registry of 65 providers and 111 kinds of key, so a key pasted from the wrong provider, or with the wrong prefix or length, is caught before it is written, with no rules for you to configure.',
  },
  {
    question: 'Does offprompt stop the agent reading the file it writes?',
    answer:
      'No. offprompt writes the key to `.env.local`, which is on disk, and it does not watch what the agent reads. Every result tells the agent not to open the file and lists the keys it holds. To enforce it, close the agent’s file tools to the file with a deny rule in Claude Code or `.cursorignore` in Cursor. [How to keep secrets out of your AI agent’s context](https://docs.offprompt.dev/guides/keep-secrets-out-of-agent-context) goes through each way in.',
  },
]

const SOURCES: Sources = [
  { label: 'Infisical introduction', href: 'https://infisical.com/docs/documentation/getting-started/introduction' },
  { label: 'Repository license', href: 'https://github.com/Infisical/infisical/blob/main/LICENSE' },
  { label: 'Self-hosting overview', href: 'https://infisical.com/docs/self-hosting/overview' },
  { label: 'CLI run', href: 'https://infisical.com/docs/cli/commands/run' },
  { label: 'CLI export', href: 'https://infisical.com/docs/cli/commands/export' },
  { label: 'Secret validation rules', href: 'https://infisical.com/docs/documentation/platform/secret-validation-rules' },
  { label: 'infisical-mcp-server', href: 'https://github.com/Infisical/infisical-mcp-server' },
  { label: 'Agent Vault', href: 'https://infisical.com/platform/agent-vault' },
  { label: 'Pricing', href: 'https://infisical.com/pricing' },
]

const Page = () => (
  <ComparePage
    page={INFISICAL}
    checked={CHECKED}
    rows={ROWS}
    questions={QUESTIONS}
    sources={SOURCES}
    lede={
      <>
        <p>
          Infisical is an open-source secrets platform. You keep a project&apos;s secrets in it, self-hosted or in
          Infisical Cloud, and read them with its CLI, SDKs, API or MCP server, with versioning, validation rules and
          machine identities around them. offprompt is for the step before a secret has a home: a coding agent hits a
          task that needs a key the project does not have, and instead of asking for it in the chat, it asks offprompt,
          which opens a page in your browser for you to type the key.
        </p>
        <p>They answer different problems, and they work together.</p>
      </>
    }
  >
    <Part title="What Infisical is best at">
      <p>
        Infisical is a home for the secrets a team already has, and it is open source: the core is under the MIT
        license, with an <code>ee/</code> directory under a separate enterprise license, and you can self-host it with
        Docker or Kubernetes or use Infisical Cloud. You organise secrets by project and environment, read them with{' '}
        <code>infisical run -- &lt;command&gt;</code> or write a <code>.env</code> with <code>infisical export</code>,
        and get versioning, secret scanning and validation rules on top.
      </p>
      <p>
        It reaches well past a key-value store: dynamic secrets, rotation, PKI, SSH, KMS and, for agents, an Agent Vault
        (preview) that proxies an agent&apos;s requests and attaches the real credential as they leave, so the agent
        never holds it. If you want a secrets platform you can run yourself, that is what Infisical is for.
      </p>
    </Part>

    <Part title="When to pick Infisical">
      <p>Reach for Infisical, not offprompt, when:</p>
      <ul className="flex list-disc flex-col gap-2 pl-5">
        <li>a team shares secrets and you want one place to hold, version and audit them;</li>
        <li>you want to self-host the secrets platform rather than depend on a SaaS;</li>
        <li>you need machine identities, dynamic secrets, rotation or PKI;</li>
        <li>you want an agent to call an API through a credential it never reads (Agent Vault).</li>
      </ul>
      <p>offprompt does none of these. It stores nothing, and once the value is in the file, it is done.</p>
    </Part>

    <Part title="Where offprompt fits">
      <p>
        offprompt covers the key that is not in any store yet, when a coding agent would otherwise ask for it in the
        chat. The agent calls <code>collect_secret</code> with the key&apos;s name, why it needs it and the file it goes
        in; offprompt opens its page on <code>127.0.0.1</code>, you type the key, and it writes the file and answers the
        agent with the key&apos;s name and a four-emoji fingerprint. The value is never in a prompt, a tool argument or a
        tool result, and from a cloud sandbox the agent passes you a link through a Cloudflare quick tunnel, with the
        value encrypted in your browser to a key only the sandbox holds.
      </p>
      <p>
        <Rich text="One honest caveat, the same offprompt gives everywhere: it writes the key to `.env.local`, and it does not stop an agent that can read files from opening it. Every result tells the agent not to and lists the keys the file holds; to be sure, close the agent's file tools to it with a deny rule in Claude Code or `.cursorignore` in Cursor." />
      </p>
    </Part>

    <Part title="Using them together">
      <p>
        Capture a new key with offprompt so its value never touches the chat, then add it to Infisical to share, version
        and rotate it. Or start from Infisical and bring what you already keep to the agent&apos;s project:
      </p>
      <Code file="On your laptop">
        {`infisical export --format=dotenv > /tmp/secrets.env
# drop /tmp/secrets.env on offprompt's page; it takes only the keys the agent asked for`}
      </Code>
      <p>
        offprompt&apos;s page reads that file and keeps only the keys the agent requested, so a sandbox holds no
        Infisical machine identity. See{' '}
        <Anchor href={`${DOCS}/guides/stores`} className={LINK}>
          Values you already keep
        </Anchor>
        . For how offprompt lines up against Infisical&apos;s MCP server in particular, next to 1Password&apos;s, read{' '}
        <Anchor href={COMPARE.href} className={LINK}>
          offprompt vs 1Password Environments MCP vs Infisical MCP
        </Anchor>
        .
      </p>
    </Part>
  </ComparePage>
)

export default Page
