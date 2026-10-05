import { Lock } from 'lucide-react'
import type { ReactNode, Ref } from 'react'

import type { SampleName } from '@/lib/samples'

/**
 * The page's size in the picture: 90% on a phone, where its text is small enough already,
 * and 75% on a wide screen, beside everything else. The page's own margin scales with it,
 * which is what a picture of part of the page bleeds either side: 24px at that size.
 */
const SCALE = '[--s:0.9] lg:[--s:0.75]'

/** Where a picture of the page's fields or fingerprint sits: its card centred, the page's margin either side. */
export const FLOATING = `-inset-x-[calc(24px*var(--s))] mx-auto w-[calc(100%+48px*var(--s))] lg:w-[calc(440px+48px*var(--s))] lg:max-w-[calc(100%-2rem+48px*var(--s))]`

type Props = {
  readonly sample: SampleName
  /** How tall the page is drawn before it is scaled, in its own pixels. */
  readonly height: number
  readonly className?: string
  /** The hero's page loads at once; the rest wait until they are near. */
  readonly eager?: boolean
  /** A page someone can use, such as pressing Regenerate, says what it shows. */
  readonly usable?: string
  /** The page's size, as classes that set `--s`, where it differs from every other picture's. */
  readonly scale?: string
  /** Lets the provider links on the page open, in a tab of their own. */
  readonly links?: boolean
  readonly frameRef?: Ref<HTMLIFrameElement>
}

/**
 * offprompt's own page for a sample, as its renderer serves it, drawn smaller. It runs in a
 * sandbox with its own origin, which cannot submit anything. Unless it is `usable`, it is
 * inert: nothing in it can be focused or clicked, and screen readers skip it.
 */
export const PagePreview = ({
  sample,
  height,
  className = '',
  eager = false,
  usable,
  scale = SCALE,
  links = false,
  frameRef,
}: Props) => (
  <div
    className={`h-[calc(var(--h)*var(--s))] overflow-hidden ${scale} ${className}`}
    style={{ '--h': `${String(height)}px` }}
    inert={usable === undefined}
  >
    <iframe
      ref={frameRef}
      src={`/samples/${sample}`}
      title={usable ?? "offprompt's page"}
      sandbox={links ? 'allow-scripts allow-popups allow-popups-to-escape-sandbox' : 'allow-scripts'}
      loading={eager ? 'eager' : 'lazy'}
      className="block h-(--h) w-[calc(100%/var(--s))] origin-top-left scale-(--s) border-0 bg-transparent"
    />
  </div>
)

const Lights = () => (
  <span className="flex shrink-0 gap-2" aria-hidden="true">
    <span className="size-2.5 rounded-full bg-paper-line" />
    <span className="size-2.5 rounded-full bg-paper-line" />
    <span className="size-2.5 rounded-full bg-paper-line" />
  </span>
)

/** A browser window around the page, on the address offprompt serves it from. */
export const Browser = ({ children, className = '' }: { readonly children: ReactNode; readonly className?: string }) => (
  <div className={`flex flex-col overflow-hidden rounded-xl bg-bg outline outline-line -outline-offset-1 ${className}`}>
    <div className="flex h-[43.5px] shrink-0 items-center gap-2.5 border-b border-line bg-white px-3.5">
      <Lights />
      <span className="rounded-md bg-bg px-2.5 py-1.5 text-[11px] text-paper-ink">offprompt</span>
      <span className="flex min-w-0 flex-1 items-center gap-1.5 px-2.5 py-1.5 text-paper-dim">
        <Lock className="size-2.5 shrink-0" aria-hidden="true" />
        <span className="truncate font-mono text-[11px]">127.0.0.1:4123</span>
      </span>
    </div>
    {children}
  </div>
)
