import type { Metadata } from 'next'

import { Anchor } from '@/components/anchor'
import { article, Code, Faq, faqPage, GuidePage, LINK, Part, type Question, Rich } from '@/components/guide'
import { Bright, Collect, Figure, Says, Session, Shot, Tool, Waiting, Written, You } from '@/components/guide-shots'
import { Services } from '@/components/services'
import { HUB, PROVIDER_GUIDES } from '@/lib/guides'
import { pageMetadata } from '@/lib/metadata'
import { DOCS, INSTALL } from '@/lib/site'

export const metadata: Metadata = pageMetadata(HUB)

const CLAUDE_CODE = `
{
  "mcpServers": {
    "offprompt": {
      "command": "npx",
      "args": ["-y", "offprompt", "mcp"],
      "timeout": 330000
    }
  }
}`

const CURSOR = `
{
  "mcpServers": {
    "offprompt": {
      "command": "npx",
      "args": ["-y", "offprompt", "mcp"]
    }
  }
}`

const CODEX = `
[mcp_servers.offprompt]
command = "npx"
args = ["-y", "offprompt", "mcp"]
tool_timeout_sec = 330`

const CALL = `
{
  "secrets": [{ "name": "OPENAI_API_KEY", "provider": "openai" }],
  "reason": "Each new support ticket gets a short summary from **OpenAI**, written by \`lib/summarise.ts\`.",
  "sink": { "kind": "dotenv", "path": ".env.local" }
}`

// A made-up key, so the picture can show what pasting puts in the transcript.
const PASTED = 'sk-proj-EXAMPLE-n0t-a-real-key-Qz4f9Wm2Lx7Rk1Tb'

const PROJECT = 'acme-support'

/** The way it usually goes: the agent asks in the chat, and the key goes into the transcript twice. */
const Pasting = () => (
  <Figure caption="Pasted into Claude Code: the key is in the conversation, and the agent echoes it again when it writes the file. Every request to the model from here on carries both. (The key is made up.)">
    <Session project={PROJECT}>
      <You>Summarise each new support ticket with OpenAI.</You>
      <Says>I need an OpenAI API key for this. Paste it here and I&apos;ll add it to .env.local.</Says>
      <You>{PASTED}</You>
      <Tool name="Write" args=".env.local">
        <span>Wrote 1 lines to .env.local</span>
        <span>
          <span className="text-term-dim">1 </span>
          <Bright>OPENAI_API_KEY={PASTED}</Bright>
        </span>
      </Tool>
    </Session>
  </Figure>
)

/** The same task with offprompt: the agent asks by name, and waits while you type. */
const Asking = () => (
  <Session project={PROJECT}>
    <You>Summarise each new support ticket with OpenAI.</You>
    <Says>That needs OPENAI_API_KEY, which isn&apos;t in .env.local yet. I&apos;ll ask you for it with offprompt.</Says>
    <Collect>
      <span>
        file: <Bright>.env.local</Bright>
      </span>
      <span>
        keys: <Bright>OPENAI_API_KEY</Bright> <span className="hidden text-term-dim lg:inline">· openai</span>
      </span>
      <span>Opened http://127.0.0.1:4123 in your browser. Waiting for you to write it…</span>
    </Collect>
    <Waiting />
  </Session>
)

/** What the agent gets back: the name, the file and the four emoji your page shows too. */
const Answered = () => (
  <Figure caption="What the agent gets back, and what your page shows once it is written. The four emoji match, so the file holds what you typed; the key itself appears nowhere in the session.">
    <Session project={PROJECT}>
      <Collect>
        <span>Wrote 1 value to .env.local · fingerprint 🍋 🥝 🌮 🧀</span>
      </Collect>
      <Says>
        Fingerprint 🍋 🥝 🌮 🧀. OPENAI_API_KEY is in .env.local; lib/summarise.ts reads it as
        process.env.OPENAI_API_KEY.
      </Says>
    </Session>
    <Written sample="guide-hub-written" />
  </Figure>
)

const QUESTIONS: readonly Question[] = [
  {
    question: 'Does the model provider see my key when the agent uses offprompt?',
    answer:
      "No. The value goes from your browser to offprompt, running on your machine, and into the file. It is never in a prompt, a tool call's arguments or its result, so nothing sent to the model provider carries it. The provider sees the key's name, the file and a four-emoji fingerprint. If the agent later opens the file, the value enters its context after all: every result tells it not to, and a deny rule in Claude Code or `.cursorignore` in Cursor closes its file tools to the file.",
  },
  {
    question: 'Does it work when the agent runs in a cloud sandbox?',
    answer:
      "Yes. From Claude Code on the web, a Cursor Cloud Agent, Codex cloud, a codespace or an SSH session, the agent shows you a link to offprompt's page through a Cloudflare quick tunnel. Your browser encrypts the values to a key made in the sandbox for that one request before they leave it, so the tunnel carries only ciphertext. The link is good for 30 minutes and one write; open it yourself and don't pass it on.",
  },
  {
    question: 'I already pasted a key into the chat. What should I do?',
    answer:
      'Rotate it. Make a new key at the provider, let the agent ask for it with offprompt, then delete or expire the old one. Deleting the conversation does not reach the copies already sent to the model provider or written into files by the agent. The provider guides below say where each key is rotated.',
  },
  {
    question: 'Does offprompt keep my keys or send them anywhere?',
    answer:
      'No. offprompt runs on your machine as a process your agent starts. It writes the values to the file the agent named, keeps none of them once they are written, collects no telemetry and has no server of ours to send anything to. It is open source under the MIT license.',
  },
  {
    question: 'Which agents does it work with?',
    answer:
      '`npx offprompt init` sets it up for Claude Code, Codex, Cursor and Pi. Any other agent that speaks MCP, such as Cline, Windsurf, Gemini CLI or VS Code, can start it with `npx -y offprompt mcp`; Cline also needs the project as its `cwd`.',
  },
  {
    question: 'Will the key end up in git?',
    answer:
      "Not unless the file is tracked. offprompt's page says whether the file is gitignored, and when the file is tracked by git it holds back the write until you tick an override. Most frameworks keep `.env.local` out of git by default; check that your `.gitignore` lists it.",
  },
]

const Hub = () => (
  <GuidePage
    guide={HUB}
    data={[article(HUB), faqPage(QUESTIONS)]}
    lede={
      <p>
        No, not into the chat. A key you paste there becomes part of the conversation: the model provider gets it with
        every later request, the transcript keeps it on disk, and the agent can copy it into a file or a commit.
        Instead, let the agent ask for the key with a tool call. With offprompt, you type the key on a page in your
        browser, it is written straight to the project&apos;s <code>.env.local</code>, and the agent only learns that
        the key exists.
      </p>
    }
    shot={
      <Shot
        session={<Asking />}
        sample="guide-hub"
        height={520}
        caption="Claude Code asks offprompt for the key by name, and offprompt's own page opens in your browser for that request. The page is offprompt's, rendered for this example; you type the key there, never in the terminal."
      />
    }
  >
    <Part title="What happens to a key you paste into the chat">
      <p>
        An agent such as Claude Code, Codex or Cursor works by sending the whole conversation to a model on every turn.
        Once a key is in the conversation, it goes along each time:
      </p>
      <ul className="flex list-disc flex-col gap-2 pl-5">
        <li>
          <strong className="font-medium text-ink">The model provider receives it</strong>, with that request and
          every later one in the session, and keeps it for as long as its data policy keeps requests.
        </li>
        <li>
          <strong className="font-medium text-ink">The transcript keeps it.</strong> Coding agents save each session
          on your disk so you can resume it, and a hosted agent keeps it in your account. A summary made when the
          conversation is compacted can repeat it.
        </li>
        <li>
          <strong className="font-medium text-ink">The agent can echo it.</strong> Asked to make something work, it
          may write the key into a config file, a test, a script or a log line, and from there into a commit.
        </li>
      </ul>
      <p>
        None of this can be taken back. A key that has been in a chat is best treated as exposed, and replaced.
      </p>
      <Pasting />
    </Part>

    <Part title="The fix: the agent asks, and you type the key somewhere else">
      <p>
        offprompt is an MCP server, a tool the agent can call. When a task needs a key the project does not have,
        the agent calls offprompt&apos;s <code>collect_secret</code> tool with the key&apos;s name, why it needs it,
        and the file it goes in:
      </p>
      <Code>{CALL}</Code>
      <ol className="flex list-decimal flex-col gap-2 pl-5">
        <li>
          A page opens in your browser, served from <code>127.0.0.1</code> on your own machine. It says which agent is
          asking, what for, and which file it will write.
        </li>
        <li>
          You paste the key. The page checks it against what offprompt knows of the provider, such as an OpenAI
          project key starting with <code>sk-proj-</code>, and links to where the key is made.
        </li>
        <li>
          offprompt writes the key to <code>.env.local</code>, and answers the agent with the key&apos;s name and a
          fingerprint of four emoji, which your page shows too:
        </li>
      </ol>
      <Answered />
      <p>
        From then on the project reads the key by name, as <code>process.env.OPENAI_API_KEY</code>. The agent never
        had the value, so it cannot repeat it.
      </p>
      <p>
        When the agent runs in a cloud sandbox, such as Claude Code on the web or Codex cloud, it cannot open a page
        on your screen. It shows you a link instead, through a Cloudflare quick tunnel. You open it in your own
        browser, which encrypts the key to one only the sandbox holds before sending it, so the tunnel carries only
        ciphertext. See{' '}
        <Anchor href={`${DOCS}/guides/cloud-sandboxes`} className={LINK}>
          Cloud sandboxes
        </Anchor>
        .
      </p>
    </Part>

    <Part id="setup" title="Set it up in 30 seconds">
      <p>
        In the project&apos;s folder, with Node 22 or later, run <code>{INSTALL}</code>. It finds Claude Code, Codex,
        Cursor and Pi on your machine and declares offprompt in each one&apos;s project config. Commit what it adds,
        and everyone on the project gets it.
      </p>
      <p>To add it by hand instead, start it from npm in each agent&apos;s config:</p>
      <Code file=".mcp.json (Claude Code)">{CLAUDE_CODE}</Code>
      <Code file=".cursor/mcp.json (Cursor)">{CURSOR}</Code>
      <Code file=".codex/config.toml (Codex)">{CODEX}</Code>
      <p>
        <Rich text="Claude Code asks once before it starts a server a project declares, and Codex reads a project's config only in a project you trust. The timeouts give you time to type: Codex otherwise ends a tool call after 60 seconds. On Linux, `init` also passes Codex the variables offprompt needs to open your browser. Other agents, such as Cline, are in [Agents](https://docs.offprompt.dev/guides/agents)." />
      </p>
      <p>
        Then ask for the task, not the key: &ldquo;Send a welcome email with Resend when someone signs up.&rdquo; The
        agent calls offprompt when it reaches the step that needs the key.
      </p>
    </Part>

    <Part title="Keep the agent out of the file afterwards">
      <p>
        offprompt keeps the key out of the conversation, but the file is on disk and the agent could still open it.
        Every result offprompt returns tells the agent not to and lists the keys the file holds, so it has no reason
        to. To make sure, close its file tools to the file:
      </p>
      <Code file=".claude/settings.json (Claude Code)">
        {`{
  "permissions": {
    "deny": ["Read(./.env)", "Read(./.env.local)"]
  }
}`}
      </Code>
      <p>
        <Rich text="In Cursor, list `.env*` in `.cursorignore`. Neither covers every shell command, so a script that prints the environment can still show the value. [How to keep secrets out of your AI agent's context](https://docs.offprompt.dev/guides/keep-secrets-out-of-agent-context) goes through each way in." />
      </p>
    </Part>

    <Part title="If you already pasted one: rotate it">
      <ol className="flex list-decimal flex-col gap-2 pl-5">
        <li>Make a new key at the provider, with no more access than the task needs.</li>
        <li>Ask the agent to use the new key with offprompt, so it is written without entering the chat.</li>
        <li>Delete or expire the old key, and check the provider&apos;s logs for requests you did not make.</li>
        <li>Search the project, and its git history, for the old value, in case the agent wrote it anywhere.</li>
      </ol>
    </Part>

    <Part title="Guides for one provider at a time">
      <p>Each sets up a key with only the access it needs, has the agent ask for it, and uses it in working code.</p>
      <ul className="flex flex-col gap-4">
        {PROVIDER_GUIDES.map(guide => (
          <li key={guide.path} className="flex flex-col gap-1">
            <Anchor href={guide.path} className={`${LINK} font-medium`}>
              {guide.title}
            </Anchor>
            <span>{guide.description}</span>
            <Services uses={guide.uses} className="pt-1" />
          </li>
        ))}
      </ul>
    </Part>

    <Faq questions={QUESTIONS} />
  </GuidePage>
)

export default Hub
