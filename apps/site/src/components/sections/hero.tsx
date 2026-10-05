import { ArrowRight, Check } from 'lucide-react'

import { INSTALL, PLAYGROUND } from '@/lib/site'

import { Anchor } from '../anchor'
import { CopyCommand } from '../copy-command'
import { FRAME } from '../frame'
import { TermFoot, TermLine, Terminal } from '../mocks'
import { Browser, PagePreview } from '../page-preview'
import { WorksWith } from './works-with'

const FACTS = ['MIT licensed', 'Works in cloud sandboxes too', 'Works with any MCP client']

/** Claude Code asking offprompt for the two keys, and waiting. */
const Session = () => (
  <Terminal title="claude — ~/acme-api" className="w-[560px] lg:w-[760px]">
    <div className="flex flex-col gap-3.5 px-[22px] pt-[18px] pb-3.5 font-mono text-[13px] leading-[21px]">
      <TermLine mark=">" markClass="text-term-fg" className="text-term-fg">
        Add Stripe webhook signature verification to the API.
      </TermLine>
      <TermLine mark="⏺" markClass="text-claude" className="text-term-fg">
        I&apos;ll verify signatures in api/webhooks/stripe.ts and deploy the handler to Vercel. That needs
        STRIPE_WEBHOOK_SECRET and VERCEL_TOKEN, which aren&apos;t in .env.local yet. I&apos;ll ask you for them.
      </TermLine>
      <div className="flex flex-col gap-0.5">
        <TermLine mark="⏺" markClass="text-mint" className="whitespace-nowrap">
          <span className="font-medium text-term-fg">offprompt - collect_secret</span>{' '}
          <span className="text-term-mid">(MCP)</span>
        </TermLine>
        <div className="flex pl-2.5 text-term-mid">
          <span className="shrink-0 whitespace-pre text-term-dim">{'⎿  '}</span>
          <div className="flex min-w-0 flex-col">
            <span>file: .env.local</span>
            <span className="whitespace-pre">
              keys: <span className="text-term-fg">STRIPE_WEBHOOK_SECRET</span>
              <span className="text-term-dim">{'  · stripe'}</span>
            </span>
            <span className="whitespace-pre">
              {'      '}
              <span className="text-term-fg">VERCEL_TOKEN</span>
              <span className="text-term-dim">{'  · vercel'}</span>
            </span>
            <span>Opened http://127.0.0.1:4123 in your browser. Waiting for you to write them…</span>
          </div>
        </div>
      </div>
      <div className="flex gap-2.5 whitespace-nowrap">
        <span className="text-claude">✻</span>
        <span className="text-claude">Waiting on offprompt…</span>
        <span className="text-term-dim">(esc to interrupt)</span>
      </div>
      <TermFoot inputClass="outline-term-line" />
    </div>
  </Terminal>
)

/** The receipt the whole picture adds up to: nothing of the values in the transcript. */
const Receipt = ({ className }: { readonly className: string }) => (
  <div
    className={`flex items-center gap-[9px] rounded-full bg-card px-3.5 py-2.5 whitespace-nowrap shadow-[0_10px_28px_#12332A1F] outline outline-line -outline-offset-1 ${className}`}
  >
    <span className="size-2 rounded-full bg-ok" />
    <span className="text-sm text-body lg:text-[17px]">Secret values in the transcript:</span>
    <span className="font-mono text-[15px] font-semibold text-ink lg:text-lg">0</span>
  </div>
)

/** The same session, narrow enough for a phone: its lines wrap, and it leaves out what would not fit. */
const PhoneSession = () => (
  <Terminal title="claude — ~/acme-api" className="w-full shadow-[0_16px_36px_#12332A33]">
    <div className="flex flex-col gap-3 px-4 pt-4 pb-[30px] font-mono text-xs leading-[1.6]">
      <TermLine mark=">" markClass="text-term-mid" className="text-term-mid">
        Add Stripe webhook signature verification to the API.
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
              keys: <span className="text-term-fg">STRIPE_WEBHOOK_SECRET</span>
            </span>
            <span>
              {'      '}
              <span className="text-term-fg">VERCEL_TOKEN</span>
            </span>
            <span>Opened 127.0.0.1:4123</span>
          </div>
        </div>
      </div>
      <div className="flex gap-2.5 whitespace-nowrap text-claude">
        <span>✻</span>
        <span>Waiting on offprompt…</span>
      </div>
    </div>
  </Terminal>
)

/**
 * The picture on a phone, one thing under another: Claude Code asking, the receipt over its
 * foot, and offprompt's page, small enough to show whole, down to its button.
 */
const PhoneShot = () => (
  <div
    className="flex flex-col rounded-t-[14px] bg-panel px-3.5 pt-3.5 pb-5 outline outline-line -outline-offset-1 md:hidden"
    aria-hidden="true"
  >
    <div className="relative">
      <PhoneSession />
      <Receipt className="absolute -bottom-5 left-3 z-[1]" />
    </div>
    <Browser className="mt-10 w-full shadow-[0_12px_32px_#12332A1A]">
      <PagePreview sample="hero" height={780} scale="[--s:0.75]" eager />
    </Browser>
  </div>
)

const ProductShot = () => (
  <div className="relative hidden h-[470px] overflow-hidden md:block lg:h-[600px]" aria-hidden="true">
    <div className="absolute top-0 left-0 h-[600px] w-[520px] rounded-t-[14px] bg-panel px-4 pt-4 outline outline-line -outline-offset-1 md:w-full lg:top-20 lg:h-[640px] lg:rounded-t-2xl lg:px-9 lg:pt-9">
      <Session />
    </div>
    <Browser className="absolute top-[132px] left-3.5 z-[1] w-[calc(100%-1.75rem)] shadow-[0_24px_56px_#12332A24,0_2px_6px_#12332A14] md:top-10 md:right-7 md:left-auto md:w-[360px] lg:top-0 lg:w-[420px]">
      <PagePreview sample="page" height={1400} eager />
    </Browser>
    <Receipt className="absolute top-[404px] left-2.5 z-[2] lg:top-[500px] lg:left-16 lg:gap-3 lg:px-5 lg:py-3" />
  </div>
)

export const Hero = () => (
  <section className="border-b border-line">
    <div className={`${FRAME} pt-12 lg:pt-[104px]`}>
      <div className="flex max-w-[800px] flex-col gap-5 lg:gap-7">
        <h1 className="text-[44px] leading-[46px] font-normal tracking-[-1.6px] text-ink lg:text-[80px] lg:leading-[82px] lg:tracking-[-2.8px]">
          Keep secrets
          <br />
          off the prompt.
        </h1>
        <p className="max-w-[640px] text-[17px] leading-[26px] text-body lg:text-xl lg:leading-[31px]">
          Agents need API keys. Paste one into the chat and it lives in the transcript for good. offprompt opens a
          page in your browser instead, and the value goes straight into the file.
        </p>
      </div>
      <div className="pt-8 lg:pt-11">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch lg:gap-4">
          <CopyCommand command={INSTALL} />
          <Anchor
            href={PLAYGROUND.href}
            className="group flex shrink-0 items-center justify-center gap-2 rounded-xl bg-card px-5 py-3.5 text-[15px] font-medium text-ink shadow-[0_1px_2px_#12332A0D] outline outline-line -outline-offset-1 transition-colors hover:bg-panel lg:px-6 lg:text-base"
          >
            {PLAYGROUND.label}
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </Anchor>
        </div>
        <ul className="flex flex-col gap-[9px] pt-4 pl-0.5 lg:flex-row lg:gap-5 lg:pl-1">
          {FACTS.map(fact => (
            <li key={fact} className="flex items-center gap-[7px] text-[13.5px] text-muted">
              <Check className="size-3.5 text-eyebrow" strokeWidth={2} aria-hidden="true" />
              {fact}
            </li>
          ))}
        </ul>
      </div>
      <div className="pt-11 lg:pt-[72px]">
        <PhoneShot />
        <ProductShot />
      </div>
    </div>
    <WorksWith />
  </section>
)
