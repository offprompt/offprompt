'use client'

import { ClipboardPaste, FileText, RotateCcw, ShieldCheck, TriangleAlert, type LucideIcon } from 'lucide-react'
import type { DemoMessage, DemoReport } from 'offprompt/showcase'
import { useEffect, useRef, useState, type ReactNode } from 'react'

import { Browser, PagePreview } from './page-preview'

/** How tall the page is drawn until it says: the form's height at the site's widths. */
const FIRST_HEIGHT = 1360

const isReport = (value: unknown): value is DemoReport =>
  typeof value === 'object' && value !== null && 'offprompt' in value && typeof value.offprompt === 'string'

type ActionProps = {
  readonly icon: LucideIcon
  readonly onClick: () => void
  readonly disabled?: boolean
  readonly primary?: boolean
  readonly children: ReactNode
}

const Action = ({ icon: Icon, onClick, disabled = false, primary = false, children }: ActionProps) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={`flex cursor-pointer items-center gap-2.5 rounded-lg px-4 py-3 text-left text-[15px] font-medium transition-colors disabled:cursor-default disabled:opacity-45 ${
      primary
        ? 'bg-brand text-white shadow-[0_6px_14px_#2B4A3B33] enabled:hover:bg-ink'
        : 'bg-card text-ink outline outline-line -outline-offset-1 enabled:hover:bg-panel'
    }`}
  >
    <Icon className="size-4 shrink-0" strokeWidth={2} aria-hidden="true" />
    {children}
  </button>
)

type SwitchProps = {
  readonly on: boolean
  readonly onChange: (on: boolean) => void
  readonly disabled: boolean
  readonly label: string
  readonly hint: string
}

const Switch = ({ on, onChange, disabled, label, hint }: SwitchProps) => (
  <button
    type="button"
    role="switch"
    aria-checked={on}
    onClick={() => onChange(!on)}
    disabled={disabled}
    className="flex cursor-pointer items-start gap-3 rounded-lg px-1 py-2 text-left disabled:cursor-default disabled:opacity-45"
  >
    <span
      className={`mt-0.5 flex h-[22px] w-[38px] shrink-0 items-center rounded-full p-[3px] transition-colors ${on ? 'bg-err' : 'bg-connector'}`}
      aria-hidden="true"
    >
      <span className={`size-4 rounded-full bg-white shadow-sm transition-transform ${on ? 'translate-x-4' : ''}`} />
    </span>
    <span className="flex flex-col gap-0.5">
      <span className="text-[15px] font-medium text-ink">{label}</span>
      <span className="text-[13.5px] leading-5 text-muted">{hint}</span>
    </span>
  </button>
)

/**
 * offprompt's own page, to use: the stand-in in the frame answers its write with the Written
 * page and a fingerprint of what was typed. The buttons beside it ask the frame to fill the
 * examples, paste a key where another belongs, or have the file hold something else, and
 * the frame says how tall the page is, when it was written, and when a field holds a value
 * that is not one of the examples.
 */
export const TryThePage = () => {
  const frame = useRef<HTMLIFrameElement>(null)
  const top = useRef<HTMLDivElement>(null)
  const [round, setRound] = useState(0)
  const [height, setHeight] = useState(FIRST_HEIGHT)
  const [written, setWritten] = useState(false)
  const [own, setOwn] = useState(false)
  const [mismatch, setMismatch] = useState(false)

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.source !== frame.current?.contentWindow || !isReport(event.data)) return
      const report = event.data
      if (report.offprompt === 'height') setHeight(report.px)
      if (report.offprompt === 'own-value') setOwn(true)
      if (report.offprompt !== 'written') return
      setWritten(true)
      // The Written page starts at the top of the frame, which is above the button that was pressed.
      const frameTop = top.current?.getBoundingClientRect().top ?? 0
      if (frameTop < 0) {
        const still = matchMedia('(prefers-reduced-motion: reduce)').matches
        top.current?.scrollIntoView({ behavior: still ? 'auto' : 'smooth', block: 'start' })
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [])

  const send = (message: DemoMessage) => frame.current?.contentWindow?.postMessage(message, '*')

  const changeMismatch = (on: boolean) => {
    setMismatch(on)
    send({ offprompt: 'mismatch', on })
  }

  const startOver = () => {
    setRound(current => current + 1)
    setWritten(false)
    setOwn(false)
    setMismatch(false)
  }

  return (
    <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-16">
      <div className="flex flex-col gap-7 lg:sticky lg:top-10 lg:w-[360px] lg:shrink-0">
        <div className="flex flex-col gap-3.5">
          <h1 className="text-[44px] leading-[46px] tracking-[-1.6px] text-ink lg:text-[56px] lg:leading-[60px] lg:tracking-[-1.8px]">
            Playground
          </h1>
          <p className="text-base leading-[25px] text-body lg:text-lg lg:leading-7">
            This is offprompt&apos;s own page, running here with a stand-in for its server. Fill it, write, and
            compare the four emoji with the agent&apos;s side.
          </p>
        </div>
        <div className="flex flex-col gap-2.5">
          <Action icon={FileText} onClick={() => send({ offprompt: 'fill' })} disabled={written} primary>
            Fill with examples
          </Action>
          <Action icon={ClipboardPaste} onClick={() => send({ offprompt: 'mix-up' })} disabled={written}>
            Paste the wrong Stripe key
          </Action>
          <Switch
            on={mismatch}
            onChange={changeMismatch}
            disabled={written}
            label="The file holds something else"
            hint="Write with it on, and the page says so."
          />
          <Action icon={RotateCcw} onClick={startOver}>
            Start over
          </Action>
        </div>
        <p className="flex gap-2.5 text-[13.5px] leading-5 text-muted">
          <ShieldCheck className="mt-px size-4 shrink-0 text-ok" aria-hidden="true" />
          <span>A demo: nothing you type leaves this page. Use the examples, not your keys.</span>
        </p>
        {own && (
          <p role="status" className="flex gap-2.5 rounded-lg bg-warn-bg px-3.5 py-3 text-[13.5px] leading-5 text-ink">
            <TriangleAlert className="mt-px size-4 shrink-0 text-warn" aria-hidden="true" />
            <span>
              That isn&apos;t one of the examples. It stayed on this page, but a real key belongs only in the page
              offprompt opens for your own agent.
            </span>
          </p>
        )}
      </div>
      <div ref={top} className="min-w-0 flex-1 scroll-mt-6">
        <Browser className="shadow-[0_12px_32px_#12332A1A]">
          <PagePreview
            key={round}
            sample="try"
            height={height}
            scale="[--s:0.9] lg:[--s:1]"
            usable="offprompt's page, to try: fill it, write, and compare the fingerprint"
            links
            frameRef={frame}
          />
        </Browser>
      </div>
    </div>
  )
}
