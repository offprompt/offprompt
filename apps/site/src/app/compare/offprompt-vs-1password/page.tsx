import type { Metadata } from 'next'

import { Anchor } from '@/components/anchor'
import { ComparePage } from '@/components/comparison'
import { Code, LINK, Part, type Question } from '@/components/guide'
import { CHECKED, ONEPASSWORD, type Row, type Sources } from '@/lib/comparisons'
import { pageMetadata } from '@/lib/metadata'
import { COMPARE, DOCS } from '@/lib/site'

export const metadata: Metadata = pageMetadata(ONEPASSWORD)

const ROWS: readonly Row[] = [
  {
    label: 'What it is',
    offprompt: 'An MCP server the agent calls to ask you for a value it lacks, which it writes into the project',
    competitor: 'A password and secrets manager: a vault your team keeps, with a CLI, SDKs and an MCP server for developers',
  },
  {
    label: 'How a value gets in',
    offprompt: 'You type or paste it on a page served from `127.0.0.1`. The agent never handles it',
    competitor: 'You save it in a 1Password vault, in the app or the CLI. A new value does not come from the task at hand',
  },
  {
    label: 'Where values live',
    offprompt: "In the project's `.env`, `.env.local` or another file the agent names",
    competitor: 'In a 1Password vault. `op run` and `op inject` resolve `op://` references without hardcoding the value',
  },
  {
    label: 'How code reads a value',
    offprompt: 'From the file, as `process.env.NAME`',
    competitor: '`op run -- <cmd>` injects secret references as env vars for the subprocess only; `op inject` renders a template',
  },
  {
    label: "Keeps a value out of the agent's context",
    offprompt: 'Yes. Results carry the key names, the file and a four-emoji fingerprint, never values',
    competitor: 'Its Environments MCP server "never returns the actual secret values stored in your Environments"',
  },
  {
    label: 'From a cloud sandbox',
    offprompt:
      'Yes. A link through a Cloudflare quick tunnel, with values encrypted in your browser to a key only the sandbox holds',
    competitor: "Its Environments MCP server is local to the desktop app; remote-only MCP clients aren't supported yet",
  },
  {
    label: 'An agent using a key it never sees',
    offprompt: 'The value never reaches the agent in the first place',
    competitor: '1Password for NVIDIA OpenShell (beta) gives the agent placeholders and swaps in the real values at a gateway',
  },
  {
    label: 'Account needed',
    offprompt: 'None',
    competitor: 'A 1Password subscription, and the desktop app for Environments',
  },
  {
    label: 'License and price',
    offprompt: 'MIT, free',
    competitor: 'A paid 1Password subscription. Its Claude Code plugin is MIT',
  },
]

const QUESTIONS: readonly Question[] = [
  {
    question: 'Is offprompt an alternative to 1Password?',
    answer:
      'No. 1Password is where a team keeps its secrets, a vault with a CLI, SDKs and apps to read them. offprompt keeps no vault. It is for the moment a task needs a key the project does not have yet: the agent asks for it by name, you type it on a page in your browser, offprompt writes it to the file, and the agent learns only that the key exists. Once a key exists, 1Password is a good place to keep it.',
  },
  {
    question: "Does 1Password keep secret values out of a coding agent's context?",
    answer:
      "Its Environments MCP server is built to: its docs say it “never returns the actual secret values stored in your Environments,” even if an agent asks, and its Claude Code plugin says the agent sees secret names and mount paths, not contents. For an agent to use a key without seeing it, 1Password for NVIDIA OpenShell (beta) gives the agent placeholders and swaps in the real values at a gateway outside the sandbox. offprompt answers a narrower question: when the value is not in 1Password yet, it gets it from you into the file without the agent handling it at all.",
  },
  {
    question: 'Can I use offprompt and 1Password together?',
    answer:
      "Yes. Capture a new key with offprompt so its value never enters the chat, then save it in a 1Password vault to share and rotate it. The other way, `op inject` or `op run` resolves the secrets you already keep into a file on your laptop, which you drop on offprompt’s page; offprompt keeps only the keys the agent asked for, so a sandbox never holds a 1Password credential.",
  },
  {
    question: 'Why would I use offprompt if my team is on 1Password?',
    answer:
      "For the key that is not in 1Password yet. When you are building with a coding agent and it needs a key you just created at a provider, saving it to a vault first is a detour, and pasting it into the chat exposes it. offprompt is the short path: the agent asks, you type the key, it lands in `.env.local`, and the value never touches the conversation. Later, move it into 1Password for the team. offprompt needs no account, so it also works where no one has signed in to 1Password yet.",
  },
  {
    question: 'Does offprompt stop the agent reading the file it writes?',
    answer:
      'No. offprompt writes the key to `.env.local`, which is on disk, and it does not watch what the agent reads. Every result tells the agent not to open the file and lists the keys it holds. To enforce it, close the agent’s file tools to the file with a deny rule in Claude Code or `.cursorignore` in Cursor. 1Password’s `op run` makes a different trade: it injects the value into a process and does not write a file at all.',
  },
]

const SOURCES: Sources = [
  { label: '1Password CLI: op run', href: 'https://www.1password.dev/cli/reference/commands/run/' },
  { label: '1Password CLI: op inject', href: 'https://www.1password.dev/cli/reference/commands/inject/' },
  { label: 'Secret references', href: 'https://www.1password.dev/cli/secret-references/' },
  { label: '1Password Environments MCP server', href: 'https://www.1password.dev/environments/mcp-server' },
  { label: 'Local .env files', href: 'https://www.1password.dev/environments/local-env-file' },
  { label: '1Password for NVIDIA OpenShell', href: 'https://www.1password.dev/environments/nvidia-openshell' },
  { label: '1Password Claude plugin (MIT)', href: 'https://github.com/1Password/1password-claude-plugin' },
]

const Page = () => (
  <ComparePage
    page={ONEPASSWORD}
    checked={CHECKED}
    rows={ROWS}
    questions={QUESTIONS}
    sources={SOURCES}
    lede={
      <>
        <p>
          1Password keeps your team&apos;s secrets in a vault you already trust, and its developer tools read them in
          place: <code>op run</code> injects secret references into a command as environment variables, and{' '}
          <code>op inject</code> renders them into a file, without hardcoding a value. offprompt is for the step before a
          secret has a home: a coding agent hits a task that needs a key the project does not have, and instead of asking
          for it in the chat, it asks offprompt, which opens a page in your browser for you to type the key.
        </p>
        <p>They answer different problems, and they work together.</p>
      </>
    }
  >
    <Part title="What 1Password is best at">
      <p>
        1Password is a vault for secrets a team already has, and a set of developer tools to read them without copying
        the value around. You reference a secret by an <code>op://vault/item/field</code> path, and the <code>op</code>{' '}
        CLI resolves it: <code>op run -- &lt;command&gt;</code> runs a command with the secrets available as environment
        variables for that subprocess only, masking them in output by default, and <code>op inject</code> renders a
        template or <code>.env</code> from those references.
      </p>
      <p>
        Around that sit Service Accounts and Connect for automation, SDKs for Go, JavaScript and Python, and the newer
        1Password Environments with its own MCP server. If your team keeps its secrets in 1Password and wants to use them
        from code without them touching disk, that is what these tools are for.
      </p>
    </Part>

    <Part title="When to pick 1Password">
      <p>Reach for 1Password, not offprompt, when:</p>
      <ul className="flex list-disc flex-col gap-2 pl-5">
        <li>a team already keeps its secrets in 1Password and shares them from there;</li>
        <li>you want secrets injected into a process at runtime, never written to disk;</li>
        <li>you want to reference secrets by path in config and code, not hold their values;</li>
        <li>you need Service Accounts or Connect for CI and automation.</li>
      </ul>
      <p>offprompt does none of these. It stores nothing and shares nothing; it writes one value you hold into a file, once.</p>
    </Part>

    <Part title="Where offprompt fits">
      <p>
        offprompt covers the key that is not in any vault yet, the moment a coding agent would otherwise ask for it in
        the chat. The agent calls <code>collect_secret</code> with the key&apos;s name, why it needs it and the file it
        goes in; offprompt opens its page on <code>127.0.0.1</code>, you type the key, and it writes the file and answers
        the agent with the key&apos;s name and a four-emoji fingerprint. The value is never in a prompt, a tool argument
        or a tool result. Because it needs no account, it also works where no one has signed in to 1Password yet, and
        from a cloud sandbox it passes you a link through a Cloudflare quick tunnel, with the value encrypted in your
        browser to a key only the sandbox holds, whereas 1Password&apos;s Environments MCP server runs locally in the
        desktop app and does not yet support remote-only clients.
      </p>
      <p>
        Its limit is plain: offprompt writes the key to <code>.env.local</code>, and it does not stop an agent that can
        read files from opening it. Every result tells the agent not to and lists the keys the file holds; to be sure,
        close the agent&apos;s file tools to it with a deny rule in Claude Code or <code>.cursorignore</code> in Cursor.
        1Password&apos;s <code>op run</code> makes a different trade, injecting the value into a process rather than
        writing a file.
      </p>
    </Part>

    <Part title="Using them together">
      <p>
        Capture a new key with offprompt so its value never touches the chat, then save it in a 1Password vault to share
        and rotate it. Or start from 1Password and bring what you already keep to the agent&apos;s project:
      </p>
      <Code file="On your laptop">
        {`op inject -i .env.tpl -o /tmp/secrets.env
# drop /tmp/secrets.env on offprompt's page, then delete it; it takes only the keys the agent asked for`}
      </Code>
      <p>
        offprompt&apos;s page reads that file and keeps only the keys the agent requested, so a sandbox holds no
        1Password credential. See{' '}
        <Anchor href={`${DOCS}/guides/stores`} className={LINK}>
          Values you already keep
        </Anchor>
        . For how offprompt lines up against 1Password&apos;s Environments MCP server in particular, next to
        Infisical&apos;s, read{' '}
        <Anchor href={COMPARE.href} className={LINK}>
          offprompt vs 1Password Environments MCP vs Infisical MCP
        </Anchor>
        .
      </p>
    </Part>
  </ComparePage>
)

export default Page
