import type { ReactNode } from 'react'

type Children = { readonly children: ReactNode }
type ClassName = { readonly className?: string | undefined }

const Lights = ({ className }: { readonly className: string }) => (
  <span className="flex shrink-0 gap-2" aria-hidden="true">
    <span className={`rounded-full ${className}`} />
    <span className={`rounded-full ${className}`} />
    <span className={`rounded-full ${className}`} />
  </span>
)

/** A dark terminal window, as Claude Code runs in one. */
export const Terminal = ({ title, children, className }: Children & ClassName & { readonly title: string }) => (
  <div className={`flex flex-col overflow-hidden rounded-xl bg-term outline outline-term-line -outline-offset-1 ${className ?? ''}`}>
    <div className="flex h-[37.5px] shrink-0 items-center gap-2 border-b border-term-line px-3.5">
      <Lights className="size-[11px] bg-term-light" />
      <div className="flex flex-1 justify-center pr-[33px]">
        <span className="font-mono text-xs leading-3 whitespace-nowrap text-term-dim">{title}</span>
      </div>
    </div>
    {children}
  </div>
)

/** A line of the session: a marker in its own column, then the text. */
export const TermLine = ({
  mark,
  markClass,
  children,
  className,
}: Children & ClassName & { readonly mark: string; readonly markClass: string }) => (
  <div className="flex w-full gap-2.5">
    <span className={`shrink-0 whitespace-pre ${markClass}`} aria-hidden="true">
      {mark}
    </span>
    <span className={`min-w-0 flex-1 ${className ?? ''}`}>{children}</span>
  </div>
)

/** The prompt box and status line at the foot of a Claude Code session. */
export const TermFoot = ({ inputClass }: { readonly inputClass: string }) => (
  <>
    <div className={`flex w-full items-center gap-2.5 rounded-md px-3.5 py-2.5 outline -outline-offset-1 ${inputClass}`}>
      <span className="text-term-mid">&gt;</span>
      <span className="h-[18px] w-2 bg-term-fg motion-safe:animate-pulse" aria-hidden="true" />
    </div>
    <div className="flex w-full justify-between gap-4 text-xs leading-5 whitespace-nowrap text-term-dim">
      <span className="whitespace-pre">{'  ? for shortcuts'}</span>
      <span>⏵⏵ accept edits on</span>
    </div>
  </>
)
