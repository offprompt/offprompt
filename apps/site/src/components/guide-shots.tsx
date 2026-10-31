import type { ReactNode } from 'react'

import type { SampleName } from '@/lib/samples'

import { TermLine, Terminal } from './mocks'
import { Browser, FLOATING, PagePreview } from './page-preview'

type Children = { readonly children: ReactNode }

/** Claude Code's session in a project, at the size a guide draws it. */
export const Session = ({ project, children }: Children & { readonly project: string }) => (
  <Terminal title={`claude — ~/${project}`} className="w-full shadow-[0_16px_36px_#12332A26]">
    <div className="flex flex-col gap-3 px-4 py-4 font-mono text-[11.5px] leading-[18px] [overflow-wrap:anywhere] lg:gap-3.5 lg:px-5 lg:py-[18px] lg:text-[13px] lg:leading-[21px]">
      {children}
    </div>
  </Terminal>
)

/** What you typed, as Claude Code shows it once sent. */
export const You = ({ children }: Children) => (
  <TermLine mark=">" markClass="text-term-mid" className="text-term-mid">
    {children}
  </TermLine>
)

/** What the agent writes back. */
export const Says = ({ children }: Children) => (
  <TermLine mark="⏺" markClass="text-claude" className="text-term-fg">
    {children}
  </TermLine>
)

/** A tool call, such as offprompt's or a command, with what came back under it. */
export const Tool = ({ name, args, children }: Children & { readonly name: string; readonly args?: string }) => (
  <div className="flex flex-col">
    <TermLine mark="⏺" markClass="text-mint">
      <span className="font-semibold text-term-fg">{name}</span>
      {args !== undefined && <span className="text-term-fg">({args})</span>}
    </TermLine>
    <div className="flex pl-2.5 text-term-mid">
      <span className="shrink-0 whitespace-pre text-term-dim">{'⎿  '}</span>
      <div className="flex min-w-0 flex-col">{children}</div>
    </div>
  </div>
)

/** offprompt's call, named as Claude Code names an MCP server's tool. */
export const Collect = ({ children }: Children) => (
  <div className="flex flex-col">
    <TermLine mark="⏺" markClass="text-mint">
      <span className="font-semibold text-term-fg">offprompt - collect_secret</span>
      <span className="text-term-mid"> (MCP)</span>
    </TermLine>
    <div className="flex pl-2.5 text-term-mid">
      <span className="shrink-0 whitespace-pre text-term-dim">{'⎿  '}</span>
      <div className="flex min-w-0 flex-col">{children}</div>
    </div>
  </div>
)

/** A value the terminal shows in full, set apart from the text around it. */
export const Bright = ({ children }: Children) => <span className="text-term-fg">{children}</span>

export const Waiting = () => (
  <div className="flex gap-2.5 text-claude">
    <span>✻</span>
    <span>
      Waiting on offprompt… <span className="text-term-dim">(esc to interrupt)</span>
    </span>
  </div>
)

/** A terminal of your own, not the agent's: a shell prompt and what the command prints. */
export const Shell = ({ project, children }: Children & { readonly project: string }) => (
  <Terminal title={`zsh — ~/${project}`} className="w-full shadow-[0_16px_36px_#12332A26]">
    <div className="flex flex-col gap-1 px-4 py-4 font-mono text-[11.5px] leading-[18px] text-term-soft [overflow-wrap:anywhere] lg:px-5 lg:py-[18px] lg:text-[13px] lg:leading-[21px]">
      {children}
    </div>
  </Terminal>
)

export const Prompt = ({ project, children }: Children & { readonly project: string }) => (
  <div>
    <span className="text-mint">~/{project}</span> <span className="text-term-mid">$</span>{' '}
    <span className="text-term-fg">{children}</span>
  </div>
)

const STAGE = 'rounded-[14px] bg-stage p-3.5 outline outline-line -outline-offset-1 lg:rounded-2xl'

/** A picture in a guide's text, with a line under it saying what it shows. */
export const Figure = ({ caption, children }: Children & { readonly caption: string }) => (
  <figure className="flex flex-col gap-2.5">
    <div className={`${STAGE} flex flex-col gap-4 lg:p-6`}>{children}</div>
    <figcaption className="text-[13.5px] leading-5 text-muted lg:text-sm">{caption}</figcaption>
  </figure>
)

/** offprompt's page once written: its fingerprint alone, as it floats on the stage. */
export const Written = ({ sample }: { readonly sample: SampleName }) => (
  <div className="relative overflow-hidden">
    <PagePreview sample={sample} height={480} className={FLOATING} />
    <div
      className="pointer-events-none absolute inset-x-0 bottom-0 h-[70px] bg-linear-to-b from-stage/0 to-stage to-85%"
      aria-hidden="true"
    />
  </div>
)

type ShotProps = {
  /** The agent's side: Claude Code asking offprompt. */
  readonly session: ReactNode
  /** Your side: offprompt's page for the same request, rendered by offprompt itself. */
  readonly sample: SampleName
  /** How much of the page shows, in its own pixels. */
  readonly height: number
  readonly caption: string
}

/**
 * A guide's main picture, the width of the page: Claude Code asking for the keys on one side,
 * and on the other the page offprompt opens for that request, typing included.
 */
export const Shot = ({ session, sample, height, caption }: ShotProps) => (
  <figure className="flex flex-col gap-2.5">
    <div className={`${STAGE} grid items-center gap-4 lg:grid-cols-[minmax(0,1fr)_440px] lg:gap-8 lg:p-8`}>
      <div className="flex min-w-0 flex-col">{session}</div>
      <Browser className="w-full shadow-[0_24px_56px_#12332A24,0_2px_6px_#12332A14]">
        <PagePreview sample={sample} height={height} />
      </Browser>
    </div>
    <figcaption className="text-[13.5px] leading-5 text-muted lg:text-sm">{caption}</figcaption>
  </figure>
)
