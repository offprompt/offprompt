import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import { Anchor } from '@/components/anchor'
import { CopyCommand } from '@/components/copy-command'
import { FRAME } from '@/components/frame'
import { JsonLd } from '@/components/json-ld'
import { LogoTile } from '@/components/logo'
import { InfisicalMark, OffpromptMark } from '@/components/marks'
import { Shell } from '@/components/shell'
import { CHECKED, FAQ, ROWS, type Tool, TOOLS } from '@/lib/compare'
import { pageMetadata } from '@/lib/metadata'
import { provider } from '@/lib/registry'
import { DOCS, INSTALL, REPO } from '@/lib/site'

const TITLE = 'offprompt vs 1Password Environments MCP vs Infisical MCP'

export const metadata: Metadata = pageMetadata({
  path: '/compare',
  title: TITLE,
  description:
    "How offprompt, 1Password's Environments MCP server and Infisical's MCP server handle an API key a coding agent needs, and which let its value reach the agent.",
  share: 'offprompt compared with 1Password Environments MCP and Infisical MCP',
})

const FAQ_PAGE = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQ.map(({ question, answer }) => ({
    '@type': 'Question',
    name: question,
    acceptedAnswer: { '@type': 'Answer', text: answer },
  })),
}

const LINK = 'text-ink underline decoration-line underline-offset-4 hover:decoration-ink'

const ONEPASSWORD = provider('onepassword').logo

const TILE = 'flex size-10 shrink-0 items-center justify-center rounded-lg text-ink outline outline-line -outline-offset-1'

/**
 * Each tool's mark on a plain tile, in the text colour, as the registry explorer draws a logo with
 * no brand colour, so no tool stands out from the others.
 */
const Mark = ({ id }: { readonly id: Tool['id'] }) => {
  if (id === 'onepassword') {
    return ONEPASSWORD === undefined ? null : <LogoTile name="1Password" logo={ONEPASSWORD} className="size-10 shrink-0" />
  }
  return (
    <span className={TILE} aria-hidden="true">
      {id === 'offprompt' ? <OffpromptMark className="h-3 w-6" /> : <InfisicalMark className="h-3 w-6" />}
    </span>
  )
}

/** Text with the parts between backticks set as code. */
const Inline = ({ text }: { readonly text: string }) =>
  text.split('`').map((part, index) => (index % 2 === 1 ? <code key={index}>{part}</code> : part))

const Part = ({ title, children }: { readonly title: string; readonly children: ReactNode }) => (
  <section className="flex flex-col gap-3 border-t border-line pt-8">
    <h2 className="text-[22px] tracking-[-0.4px] text-ink lg:text-[26px]">{title}</h2>
    <div className="flex flex-col gap-3 text-base leading-[26px] text-body lg:text-[17px] lg:leading-7">{children}</div>
  </section>
)

const Table = () => (
  <div className="overflow-x-auto border-y border-line">
    <table className="w-full min-w-[760px] table-fixed border-collapse text-left text-[14px] leading-[21px] lg:text-[14.5px]">
      <thead>
        <tr className="border-b border-line">
          <th scope="col" className="w-[160px] py-3 pr-4 font-medium text-muted">
            <span className="sr-only">Question</span>
          </th>
          {TOOLS.map(tool => (
            <th key={tool.id} scope="col" className="py-3 pr-4 align-bottom font-medium text-ink">
              <span className="flex flex-col items-start gap-2.5">
                <Mark id={tool.id} />
                {tool.name}
              </span>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {ROWS.map(row => (
          <tr key={row.label} className="border-b border-line last:border-b-0">
            <th scope="row" className="py-3 pr-4 align-top font-medium text-ink">
              {row.label}
            </th>
            {TOOLS.map(tool => (
              <td key={tool.id} className={`py-3 pr-4 align-top [overflow-wrap:anywhere] ${tool.id === 'offprompt' ? 'text-ink' : 'text-body'}`}>
                <Inline text={row[tool.id]} />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)

const Compare = () => (
  <Shell>
    <JsonLd data={FAQ_PAGE} />
    <div className={`${FRAME} flex flex-col gap-10 pt-16 pb-24 lg:pt-[104px] lg:pb-32`}>
      <div className="flex max-w-[760px] flex-col gap-6">
        <h1 className="text-[40px] leading-[44px] tracking-[-1.4px] text-ink lg:text-[52px] lg:leading-[58px] lg:tracking-[-1.8px]">
          {TITLE}
        </h1>
        <p className="text-[17px] leading-7 text-body lg:text-xl lg:leading-8">
          offprompt is for the moment a coding agent needs a key it does not have. You type the key on a page served
          from <code>127.0.0.1</code>, offprompt writes it straight to the project&apos;s <code>.env</code> or{' '}
          <code>.env.local</code>, and only the key&apos;s name, never its value, enters the agent&apos;s transcript.
          1Password&apos;s and Infisical&apos;s MCP servers give the agent access to a secrets store you already keep.
          They answer different problems, and they work together.
        </p>
      </div>

      <section className="flex flex-col gap-5">
        <h2 className="text-[22px] tracking-[-0.4px] text-ink lg:text-[26px]">At a glance</h2>
        <Table />
        <p className="text-[13.5px] text-muted lg:text-sm">
          What each tool&apos;s own docs say, as of {CHECKED}. &ldquo;Not documented&rdquo; means its docs do not
          say.
        </p>
      </section>

      <div className="flex max-w-[680px] flex-col gap-10">
        <Part title="What offprompt does differently">
          <p>
            <strong className="font-medium text-ink">The value never passes through the agent.</strong> The agent
            calls offprompt with the names of the keys it needs, why, and the file they go in. offprompt opens a page in
            your browser on <code>127.0.0.1</code>, you paste each key there, and offprompt writes the file. The agent
            gets back the key names and a four-emoji fingerprint to compare with the page. The value is never in a
            prompt, a tool argument or a tool result.
          </p>
          <p>
            <strong className="font-medium text-ink">It works from cloud sandboxes.</strong> When the agent runs in
            Claude Code on the web, a Cursor Cloud Agent, Codex cloud or a codespace, it passes you a link through a
            Cloudflare quick tunnel. Your browser encrypts the values to a key only the sandbox holds, so the tunnel
            carries ciphertext, and the sandbox needs no login to a secrets store.
          </p>
          <p>
            <strong className="font-medium text-ink">It knows what a key looks like.</strong> Its registry knows 65
            providers and 111 kinds of key: where each is made, and the prefix and length it should have, so a key
            pasted from the wrong provider is caught before it is written.
          </p>
          <p>
            <strong className="font-medium text-ink">It needs nothing else.</strong> No account and no server: it is
            open source under the MIT license, and <code>{INSTALL}</code> sets it up for Claude Code, Codex, Cursor and
            Pi in the project.
          </p>
        </Part>

        <Part title="When another tool fits">
          <p>
            offprompt does not store, share, sync or rotate secrets, and once the file is written it does not guard
            it: the agent could still open it, which every result tells it not to do. If your team already keeps its
            secrets in 1Password or Infisical, their tools keep them there. 1Password&apos;s mounted <code>.env</code>{' '}
            is never stored on disk, and Infisical&apos;s MCP server lets an agent manage a project&apos;s secrets,
            with values masked when you turn that on.
          </p>
          <p>
            They combine, too. A store&apos;s command line, such as <code>op inject</code> or{' '}
            <code>infisical export</code>, writes a file on your machine that you drop on offprompt&apos;s page, which
            takes only the keys the agent asked for. See{' '}
            <Anchor href={`${DOCS}/guides/stores`} className={LINK}>
              Values you already keep
            </Anchor>
            .
          </p>
        </Part>

        <Part title="Sources">
          <ul className="flex flex-col gap-3">
            {TOOLS.map(tool => (
              <li key={tool.id}>
                <span className="text-ink">{tool.name}:</span>{' '}
                {tool.sources.map((source, index) => (
                  <span key={source.href}>
                    {index > 0 && ', '}
                    <Anchor href={source.href} className={LINK}>
                      {source.label}
                    </Anchor>
                  </span>
                ))}
              </li>
            ))}
          </ul>
          <p>
            Something here out of date? Open an issue on{' '}
            <Anchor href={`${REPO}/issues`} className={LINK}>
              GitHub
            </Anchor>
            .
          </p>
        </Part>

        <Part title="FAQ">
          {FAQ.map(({ question, answer }) => (
            <div key={question} className="flex flex-col gap-1.5 pt-2">
              <h3 className="text-[17px] font-medium text-ink lg:text-lg">{question}</h3>
              <p>{answer}</p>
            </div>
          ))}
        </Part>

        <Part title="Try it">
          <p>
            In a project, run the command below, then ask the agent for something that needs a key. Or read{' '}
            <Anchor href={`${DOCS}/guides/keep-secrets-out-of-agent-context`} className={LINK}>
              how to keep secrets out of your AI agent&apos;s context
            </Anchor>
            .
          </p>
          <div>
            <CopyCommand command={INSTALL} />
          </div>
        </Part>
      </div>
    </div>
  </Shell>
)

export default Compare
