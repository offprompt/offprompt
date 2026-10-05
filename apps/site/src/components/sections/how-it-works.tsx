import { ArrowRight } from 'lucide-react'
import type { ReactNode } from 'react'

import { PLAYGROUND } from '@/lib/site'

import { Anchor } from '../anchor'
import { FRAME } from '../frame'
import { TermLine, Terminal } from '../mocks'
import { Browser, FLOATING, PagePreview } from '../page-preview'

type Children = { readonly children: ReactNode }

/** Fades a stage's picture out at its foot, where the stage cuts it off. */
const StageFade = () => (
  <div
    className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-[70px] bg-linear-to-b from-stage/0 to-stage to-85%"
    aria-hidden="true"
  />
)

/**
 * Where a picture sits on its stage: inset a little on a phone, centred at its own width, given
 * as a class, on a wide screen.
 */
const centred = (width: string) => `absolute inset-x-2.5 mx-auto lg:inset-x-0 ${width} lg:max-w-[calc(100%-3rem)]`

/** Claude Code asking offprompt for two keys, and waiting on it: the whole session at once, centred on its stage. */
const Asks = () => (
  <Terminal
    title="claude — ~/acme-api"
    className={`${centred('lg:w-[504px]')} top-1/2 -translate-y-1/2 shadow-[0_16px_36px_#12332A33]`}
  >
    <div className="flex flex-col gap-3 p-3.5 font-mono text-[11px] leading-[17px] lg:gap-3.5 lg:px-5 lg:py-[18px] lg:text-[13.5px] lg:leading-[22px]">
      <TermLine mark=">" markClass="text-term-mid" className="text-term-mid">
        Verify Stripe webhooks, then deploy to Vercel.
      </TermLine>
      <TermLine mark="⏺" markClass="text-claude" className="text-term-fg">
        Two keys are missing from .env.local. I&apos;ll ask you.
      </TermLine>
      <div className="flex flex-col">
        <TermLine mark="⏺" markClass="text-mint" className="whitespace-nowrap">
          <span className="font-semibold text-term-fg">offprompt - collect_secret</span>
          <span className="text-term-mid"> (MCP)</span>
        </TermLine>
        <div className="flex pl-2.5 text-term-mid">
          <span className="shrink-0 whitespace-pre text-term-dim">{'⎿  '}</span>
          <div className="flex min-w-0 flex-col whitespace-pre">
            <span>
              file: <span className="text-term-fg">.env.local</span>
            </span>
            <span>
              keys: <span className="text-term-fg">STRIPE_WEBHOOK_SECRET</span>
              <span className="hidden text-term-dim lg:inline">{'  · stripe'}</span>
            </span>
            <span>
              {'      '}
              <span className="text-term-fg">VERCEL_TOKEN</span>
              <span className="hidden text-term-dim lg:inline">{'  · vercel'}</span>
            </span>
            <span>
              Opened 127.0.0.1:4123<span className="hidden lg:inline"> in your browser</span>
            </span>
          </div>
        </div>
      </div>
      <div className="flex gap-2.5 whitespace-nowrap">
        <span className="text-claude">✻</span>
        <span className="text-claude">Waiting on offprompt…</span>
        <span className="hidden text-term-dim lg:inline">(esc to interrupt)</span>
      </div>
    </div>
  </Terminal>
)

type StepProps = Children & {
  readonly number: string
  readonly name: string
  readonly description: string
  /** The last step's circle is filled, and the rail stops at it. */
  readonly last?: boolean
}

/** One step: its circle on the rail, what happens, and a picture of it on a stage beside or below. */
const Step = ({ number, name, description, last = false, children }: StepProps) => (
  <li className="flex gap-3 lg:gap-0">
    <div className="flex w-7 shrink-0 flex-col items-center lg:w-14" aria-hidden="true">
      <span
        className={`flex size-7 shrink-0 items-center justify-center rounded-full font-mono text-[11px] outline outline-line -outline-offset-1 lg:size-10 lg:text-[13px] ${
          last ? 'bg-brand text-white' : 'bg-card text-ink'
        }`}
      >
        {number}
      </span>
      {!last && <span className="w-px flex-1 bg-rail" />}
    </div>
    <div className={`flex min-w-0 flex-1 flex-col gap-5 lg:flex-row lg:gap-0 ${last ? '' : 'pb-11 lg:pb-10'}`}>
      <div className="flex flex-col gap-2.5 lg:w-[360px] lg:shrink-0 lg:gap-3.5 lg:pr-12 lg:pl-4">
        {/* Each line is as tall as the circle, so the first sits level with the number. */}
        <h3 className="text-2xl leading-7 tracking-[-0.6px] text-balance text-ink lg:text-[30px] lg:leading-10 lg:tracking-[-0.8px]">
          {name}
        </h3>
        <p className="text-base leading-[1.55] text-body lg:text-[17px]">{description}</p>
      </div>
      <div
        className="relative h-[340px] min-w-0 overflow-hidden rounded-[14px] bg-stage lg:h-[360px] lg:flex-1 lg:rounded-2xl"
        aria-hidden="true"
      >
        {children}
      </div>
    </div>
  </li>
)

export const HowItWorks = () => (
  <section id="how-it-works" className="scroll-mt-6 border-b border-line bg-panel">
    <div className={`${FRAME} flex flex-col items-center gap-10 pt-16 pb-[72px] lg:gap-14 lg:pt-28 lg:pb-32`}>
      <div className="flex flex-col items-center gap-3.5 text-center lg:gap-[18px]">
        <h2 className="text-[34px] leading-[38px] tracking-[-1px] text-ink lg:text-5xl lg:leading-[53px] lg:tracking-[-1.4px]">
          Twenty seconds,
          <br />
          start to finish.
        </h2>
        <p className="max-w-[600px] text-base leading-[25px] text-body lg:text-lg lg:leading-7">
          The agent pauses, you enter the values, it continues. Only the key names pass through the transcript, so
          there&apos;s nothing to redact later.
        </p>
        <Anchor href={PLAYGROUND.href} className="group flex items-center gap-2 text-[15px] font-medium text-ink">
          Try it in the playground
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </Anchor>
      </div>
      <ol className="flex w-full flex-col">
        <Step
          number="01"
          name="The agent needs secrets"
          description="The agent names the keys it needs and the file they go in, then waits."
        >
          <Asks />
        </Step>
        <Step
          number="02"
          name="User inputs via browser"
          description="A page opens in your browser. It says who is asking, why, and where it writes, and checks each value as you type."
        >
          <Browser className={`${centred('lg:w-[440px]')} top-6 shadow-[0_12px_32px_#12332A1A] lg:top-7`}>
            <PagePreview sample="opens" height={900} />
          </Browser>
          <StageFade />
        </Step>
        <Step
          number="03"
          name="Secrets are safely written to file"
          description="The same four emoji on your page and in the agent's reply: the file holds what you typed."
          last
        >
          <PagePreview sample="receipt" height={720} className={`absolute top-0 ${FLOATING}`} />
          <StageFade />
        </Step>
      </ol>
    </div>
  </section>
)
