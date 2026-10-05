import Link from 'next/link'
import type { ReactNode } from 'react'

type Props = {
  readonly href: string
  readonly children: ReactNode
  readonly className?: string
  readonly onClick?: () => void
  readonly 'aria-label'?: string
}

/** A link: through the router for a page of this site, a plain anchor for a file or anywhere else. */
export const Anchor = ({ href, children, className, onClick, 'aria-label': label }: Props) => {
  const shared = {
    className,
    'aria-label': label,
    ...(onClick === undefined ? {} : { onClick }),
  }
  // A page of this site goes through the router; a file it serves, such as a .txt, is fetched as it is.
  const routed = href.startsWith('/') && !/\.[a-z]+$/.test(href.split('#')[0] ?? '')
  return routed ? (
    <Link href={href} {...shared}>
      {children}
    </Link>
  ) : (
    <a href={href} {...shared}>
      {children}
    </a>
  )
}
