'use client'

import { Menu, X } from 'lucide-react'
import { useState } from 'react'

import type { Link } from '@/lib/site'

import { Anchor } from './anchor'

type Props = { readonly links: readonly Link[] }

/** The nav's links behind a button, below the large breakpoint. */
export const MobileMenu = ({ links }: Props) => {
  const [open, setOpen] = useState(false)
  const Icon = open ? X : Menu

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls="mobile-menu"
        aria-label={open ? 'Close menu' : 'Open menu'}
        className="-m-2 flex cursor-pointer p-2 text-ink"
      >
        <Icon className="size-[22px]" strokeWidth={1.75} aria-hidden="true" />
      </button>
      {open && (
        <nav
          id="mobile-menu"
          className="absolute inset-x-0 top-full z-20 border-b border-line bg-bg px-7 pt-2 pb-6 md:px-12"
        >
          <ul className="flex flex-col">
            {links.map(({ label, href }) => (
              <li key={label}>
                <Anchor
                  href={href}
                  onClick={() => setOpen(false)}
                  className="block border-b border-line py-3.5 text-base text-body transition-colors hover:text-ink"
                >
                  {label}
                </Anchor>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  )
}
