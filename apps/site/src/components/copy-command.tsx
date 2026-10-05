'use client'

import { Check, Copy } from 'lucide-react'
import { useEffect, useState } from 'react'

type Props = { readonly command: string }

/** The install command in a bar, with a button that copies it. */
export const CopyCommand = ({ command }: Props) => {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return undefined
    const timer = setTimeout(() => setCopied(false), 2000)
    return () => clearTimeout(timer)
  }, [copied])

  const copy = () => {
    void navigator.clipboard.writeText(command).then(() => setCopied(true))
  }

  const Icon = copied ? Check : Copy

  return (
    <div className="flex w-full items-center justify-between rounded-xl bg-card py-[5px] pr-[5px] pl-4 shadow-[0_1px_2px_#12332A0D] outline outline-line -outline-offset-1 lg:w-[580px] lg:py-1.5 lg:pr-1.5 lg:pl-[22px]">
      <code className="flex min-w-0 items-center gap-2.5 font-mono text-[15px] whitespace-nowrap lg:gap-3 lg:text-base">
        <span className="text-muted select-none" aria-hidden="true">
          $
        </span>
        <span className="truncate font-medium text-ink">{command}</span>
      </code>
      <button
        type="button"
        onClick={copy}
        className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg bg-brand px-3.5 py-[11px] text-sm font-medium text-white shadow-[0_6px_14px_#2B4A3B33] transition-colors hover:bg-ink lg:gap-2 lg:px-5 lg:py-[13px] lg:text-[15px]"
      >
        <Icon className="size-4" strokeWidth={2} aria-hidden="true" />
        <span aria-live="polite">
          {copied ? (
            'Copied'
          ) : (
            <>
              Copy<span className="hidden lg:inline"> command</span>
            </>
          )}
        </span>
      </button>
    </div>
  )
}
