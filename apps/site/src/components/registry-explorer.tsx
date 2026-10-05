'use client'

import type { DemoMessage, DemoReport } from 'offprompt/showcase'
import { useEffect, useRef, useState } from 'react'

import type { RegistryEntry } from '@/lib/registry'

import { LogoTile } from './logo'
import { PagePreview } from './page-preview'

/** How tall the field is drawn until the page says: a key's field at the site's widths. */
const FIRST_HEIGHT = 260

const isReport = (value: unknown): value is DemoReport =>
  typeof value === 'object' && value !== null && 'offprompt' in value && typeof value.offprompt === 'string'

type ListProps = {
  readonly entries: readonly RegistryEntry[]
  readonly selected: string
  readonly onSelect: (id: string) => void
  /**
   * The second copy that makes the scroll seamless. It is on screen as often as the first, so
   * it can be clicked too, but it is not read out or reached by tab.
   */
  readonly echo?: boolean
}

const List = ({ entries, selected, onSelect, echo = false }: ListProps) => (
  <ul className={`flex flex-col ${echo ? 'motion-reduce:hidden' : ''}`} aria-hidden={echo ? 'true' : undefined}>
    {entries.map(entry => (
      <li key={entry.id}>
        <button
          type="button"
          onClick={() => onSelect(entry.id)}
          aria-pressed={entry.id === selected}
          tabIndex={echo ? -1 : undefined}
          className={`flex w-full cursor-pointer items-center gap-3 rounded-lg border-b border-line px-3 py-2.5 text-left transition-colors lg:py-[11px] ${
            entry.id === selected ? 'bg-panel' : 'hover:bg-panel/60'
          }`}
        >
          <LogoTile name={entry.name} logo={entry.logo} color={entry.color} className="size-8 shrink-0" />
          <span className={`flex-1 text-sm lg:text-[15px] ${entry.id === selected ? 'font-medium text-ink' : 'text-ink'}`}>
            {entry.name}
          </span>
          <span className="font-mono text-xs text-body lg:text-[13px]">{entry.shape}</span>
        </button>
      </li>
    ))}
  </ul>
)

/**
 * Every provider in offprompt's registry, drifting past slowly, and offprompt's own field for
 * whichever one is picked: its logo, the link to where the key is made, and its checks, with an
 * example key in it to change. The field is the page itself, in a frame that holds one for
 * every provider and shows the one it is told to. Hovering or focusing the list holds it still;
 * with reduced motion it stands and scrolls by hand.
 */
export const RegistryExplorer = ({ entries }: { readonly entries: readonly RegistryEntry[] }) => {
  const frame = useRef<HTMLIFrameElement>(null)
  const [selected, setSelected] = useState(entries[0]?.id ?? '')
  const [height, setHeight] = useState(FIRST_HEIGHT)
  const entry = entries.find(candidate => candidate.id === selected) ?? entries[0]
  const shown = useRef(entry?.key)

  useEffect(() => {
    const element = frame.current
    const send = () => {
      const key = shown.current
      if (key === undefined) return
      const message: DemoMessage = { offprompt: 'show', key }
      element?.contentWindow?.postMessage(message, '*')
    }
    const onMessage = (event: MessageEvent) => {
      if (event.source !== element?.contentWindow || !isReport(event.data)) return
      if (event.data.offprompt === 'height') setHeight(event.data.px)
    }
    window.addEventListener('message', onMessage)
    // The frame shows the first field until told otherwise; a pick made while it loaded is told again once it has.
    element?.addEventListener('load', send)
    return () => {
      window.removeEventListener('message', onMessage)
      element?.removeEventListener('load', send)
    }
  }, [])

  const show = (key: string | undefined) => {
    shown.current = key
    if (key === undefined) return
    const message: DemoMessage = { offprompt: 'show', key }
    frame.current?.contentWindow?.postMessage(message, '*')
  }

  const pick = (id: string) => {
    setSelected(id)
    show(entries.find(candidate => candidate.id === id)?.key)
  }

  if (entry === undefined) return null
  return (
    // Stacked below the large breakpoint, the list takes whatever room the field leaves; side by side, each keeps its place.
    <div className="absolute inset-0 flex flex-col gap-5 pt-3 lg:block lg:pt-0">
      <div className="relative w-full shrink-0 lg:absolute lg:top-6 lg:left-8 lg:w-[calc(55%-2rem)] lg:max-w-[560px]">
        <PagePreview
          sample="schemas"
          height={height}
          scale="[--s:0.9] lg:[--s:1]"
          usable={`offprompt's field for ${entry.name}'s key, with an example key in it you can change`}
          links
          frameRef={frame}
          className="-mx-[calc(24px*var(--s))] w-[calc(100%+48px*var(--s))]"
        />
      </div>
      <div className="relative flex min-h-0 w-full flex-1 flex-col gap-1 lg:absolute lg:top-10 lg:right-8 lg:bottom-0 lg:w-[36%] lg:max-w-[390px]">
        <span className="text-[13px] text-muted">From the registry · pick one</span>
        <div className="group min-h-0 flex-1 overflow-hidden pt-1.5 [mask-image:linear-gradient(to_bottom,transparent,black_20px)] motion-reduce:overflow-y-auto">
          <div className="animate-registry group-focus-within:[animation-play-state:paused] group-hover:[animation-play-state:paused] motion-reduce:animate-none">
            <List entries={entries} selected={entry.id} onSelect={pick} />
            <List entries={entries} selected={entry.id} onSelect={pick} echo />
          </div>
        </div>
      </div>
    </div>
  )
}
