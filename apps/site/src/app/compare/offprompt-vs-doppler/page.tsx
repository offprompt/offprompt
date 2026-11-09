import type { Metadata } from 'next'

import { Anchor } from '@/components/anchor'
import { ComparePage } from '@/components/comparison'
import { Code, LINK, Part, type Question, Rich } from '@/components/guide'
import { CHECKED, DOPPLER, type Row, type Sources } from '@/lib/comparisons'
import { pageMetadata } from '@/lib/metadata'
import { DOCS } from '@/lib/site'

export const metadata: Metadata = pageMetadata(DOPPLER)

const ROWS: readonly Row[] = [
  {
    label: 'What it is',
    offprompt: 'An MCP server the agent calls to ask you for a value it lacks, which it writes into the project',
    competitor: "A hosted secrets manager that keeps a team's secrets in one place and syncs them to every environment",
  },
  {
    label: 'How a value gets in',
    offprompt: 'You type or paste it on a page served from `127.0.0.1`. The agent never handles it',
    competitor: 'You add it in the dashboard, the CLI or the API. A new value does not come from the task at hand',
  },
  {
    label: 'Where values live',
    offprompt: "In the project's `.env`, `.env.local` or another file the agent names",
    competitor: "In Doppler's cloud, synced out to each environment and the services you connect",
  },
  {
    label: 'How code reads a value',
    offprompt: 'From the file, as `process.env.NAME`',
    competitor: '`doppler run -- <cmd>` injects the secrets as environment variables at runtime, with no `.env` on disk',
  },
  {
    label: "Keeps a value out of the agent's context",
    offprompt: 'Yes. Results carry the key names, the file and a four-emoji fingerprint, never values',
    competitor:
      "Not its aim. Its guidance for agents is a scoped, read-only, expiring credential per agent, so an agent reads only what you grant",
  },
  {
    label: "Checks a key's format",
    offprompt: 'Yes, for 65 providers and 111 kinds of key, such as a prefix and a length, plus 12 formats',
    competitor: 'Not documented for particular providers',
  },
  {
    label: 'From a cloud sandbox',
    offprompt:
      'Yes. A link through a Cloudflare quick tunnel, with values encrypted in your browser to a key only the sandbox holds',
    competitor: 'The CLI or the MCP server runs wherever you give it a Doppler token',
  },
  {
    label: 'For AI agents',
    offprompt: 'The whole tool: an agent asks, you type, the value lands in the file',
    competitor: 'An official MCP server, marked experimental, that lets an agent work with the Doppler API, with a read-only mode',
  },
  {
    label: 'Account needed',
    offprompt: 'None',
    competitor: 'A Doppler account, with a service token for automation',
  },
  {
    label: 'License and price',
    offprompt: 'MIT, free',
    competitor: 'The CLI is Apache-2.0. The platform is a hosted service: free for three users, then paid',
  },
]

const QUESTIONS: readonly Question[] = [
  {
    question: 'Is offprompt an alternative to Doppler?',
    answer:
      'No. Doppler is where a team keeps its secrets and syncs them to every environment; offprompt keeps no store and syncs nothing. offprompt is for one moment: a task needs a key the project does not have yet, and rather than paste it into the chat, the agent asks for it, you type it on a page in your browser, and it is written to the file. Once a key exists, Doppler is a good place to put it.',
  },
  {
    question: 'Can I use offprompt and Doppler together?',
    answer:
      'Yes, and that is the intended shape. Use offprompt when a key first appears, so its value never enters the chat, then add it to Doppler to share and rotate across the team. The other way round, `doppler secrets download` writes a file on your laptop that you drop on offprompt’s page, which takes only the keys the agent asked for, so a sandbox need never hold a Doppler token.',
  },
  {
    question: "Does Doppler's MCP server keep secret values out of the agent's context?",
    answer:
      'Doppler ships an official MCP server, which it marks experimental, that lets an agent work with the Doppler API, and it has a read-only mode. Doppler’s own guidance for agents is to give each agent a scoped, read-only, expiring credential. offprompt answers a narrower question: when the value does not exist in any store yet, it gets it from you into the file without the agent handling it at all.',
  },
  {
    question: 'Does Doppler write a .env file an agent could read?',
    answer:
      "Not by default: `doppler run` injects the secrets as environment variables into the process it runs, with no file on disk. offprompt does write a file, the project’s `.env.local`, because that is where the project reads the key. offprompt does not stop an agent that can read files from opening it, so close the agent’s file tools to it: a deny rule in Claude Code, `.cursorignore` in Cursor.",
  },
  {
    question: 'Do I need an account to use offprompt?',
    answer:
      'No. offprompt runs on your machine as a process the agent starts, keeps nothing once the value is written, and has no server of ours to sign in to. Doppler is a hosted service that needs an account and, for automation, a service token. offprompt is open source under the MIT license; `npx offprompt init` sets it up.',
  },
]

const SOURCES: Sources = [
  { label: 'Doppler CLI', href: 'https://docs.doppler.com/docs/cli' },
  { label: 'Doppler MCP server', href: 'https://docs.doppler.com/docs/mcp' },
  { label: 'Doppler for AI agents', href: 'https://www.doppler.com/agents' },
  { label: 'Integrations', href: 'https://www.doppler.com/integrations' },
  { label: 'Service tokens', href: 'https://docs.doppler.com/docs/service-tokens' },
  { label: 'Pricing', href: 'https://www.doppler.com/pricing' },
  { label: 'Doppler CLI on GitHub (Apache-2.0)', href: 'https://github.com/DopplerHQ/cli' },
]

const Page = () => (
  <ComparePage
    page={DOPPLER}
    checked={CHECKED}
    rows={ROWS}
    questions={QUESTIONS}
    sources={SOURCES}
    lede={
      <>
        <p>
          Doppler is a secrets manager. You keep a project&apos;s secrets in one place, and Doppler syncs them to every
          environment and injects them at runtime, so no one copies a value between a <code>.env</code> and a dashboard.
          offprompt is for the step before a secret has a home: a coding agent hits a task that needs a key the project
          does not have, and instead of asking for it in the chat, it asks offprompt, which opens a page in your browser
          for you to type the key.
        </p>
        <p>They answer different problems, and they work well in the same project.</p>
      </>
    }
  >
    <Part title="What Doppler is best at">
      <p>
        Doppler is a single source of truth for the secrets a team already has. You organise them by project and
        environment, and the <code>doppler run -- &lt;command&gt;</code> CLI injects them as environment variables into
        the process it starts, so a service reads its config with no <code>.env</code> written to disk.
      </p>
      <p>
        Around that it does the work a store does: it syncs secrets out to the services you already use, such as Vercel,
        AWS Secrets Manager and GitHub Actions; it fires webhooks when a value changes; and on its paid plans it rotates
        secrets and, on Enterprise, issues short-lived dynamic secrets. If your problem is keeping one set of secrets
        consistent across machines, people and environments, that is what Doppler is for.
      </p>
    </Part>

    <Part title="When to pick Doppler">
      <p>Reach for Doppler, not offprompt, when:</p>
      <ul className="flex list-disc flex-col gap-2 pl-5">
        <li>a team shares secrets and you want one place to hold, change and audit them;</li>
        <li>you want secrets injected at runtime rather than written to a file;</li>
        <li>you need the same values synced to Vercel, AWS, a CI runner or another service;</li>
        <li>you want rotation, versioning or dynamic, short-lived credentials.</li>
      </ul>
      <p>offprompt does none of these. It does not store, sync, rotate or audit; once the value is in the file, it is done.</p>
    </Part>

    <Part title="Where offprompt fits">
      <p>
        offprompt covers the moment a key does not exist in any store yet, when a coding agent would otherwise ask for
        it in the chat. The agent calls offprompt&apos;s <code>collect_secret</code> with the key&apos;s name, why it
        needs it and the file it goes in; offprompt opens its page on <code>127.0.0.1</code>, you type the key, and it
        writes the file and answers the agent with the key&apos;s name and a four-emoji fingerprint. The value is never
        in a prompt, a tool argument or a tool result.
      </p>
      <p>
        From a cloud sandbox, such as Claude Code on the web or Codex cloud, the agent passes you a link through a
        Cloudflare quick tunnel; your browser encrypts the value to a key only the sandbox holds, so the sandbox needs
        no Doppler token and the tunnel carries only ciphertext.
      </p>
      <p>
        Its limit is plain: offprompt writes the key to <code>.env.local</code>, and it does not stop an agent that can
        read files from opening that file. Every result tells the agent not to and lists the keys the file holds; to be
        sure, close the agent&apos;s file tools to it with a deny rule in Claude Code or <code>.cursorignore</code> in
        Cursor.
      </p>
    </Part>

    <Part title="Using them together">
      <p>
        The two chain in either direction. Capture a new key with offprompt so its value never touches the chat, then
        add it to Doppler to share and rotate it across the team. Or start from Doppler: its CLI writes the values you
        already keep to a file on your laptop, which you drop on offprompt&apos;s page.
      </p>
      <Code file="On your laptop">
        {`doppler secrets download --no-file --format=env > /tmp/secrets.env
# drop /tmp/secrets.env on offprompt's page; it takes only the keys the agent asked for`}
      </Code>
      <p>
        offprompt&apos;s page reads that file and keeps only the keys the agent requested, so a sandbox holds no Doppler
        credential. See{' '}
        <Anchor href={`${DOCS}/guides/stores`} className={LINK}>
          Values you already keep
        </Anchor>
        .
      </p>
      <p>
        <Rich text="Doppler's own advice for agents is a scoped, read-only, expiring credential per agent. offprompt and that advice point the same way: an agent should touch a secret as narrowly as the task allows, and never carry its value in the conversation." />
      </p>
    </Part>
  </ComparePage>
)

export default Page
