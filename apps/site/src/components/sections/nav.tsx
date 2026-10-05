import { stars } from '@/lib/github'
import { NAV, PLAYGROUND, REPO } from '@/lib/site'

import { Anchor } from '../anchor'
import { FRAME } from '../frame'
import { GitHubMark, OffpromptMark } from '../marks'
import { MobileMenu } from '../mobile-menu'

export const Brand = () => (
  <Anchor href="/" className="flex items-center gap-2.5 text-ink" aria-label="offprompt, home">
    <OffpromptMark className="h-4 w-8" />
    <span className="text-[19px] font-medium tracking-[-0.4px]">offprompt</span>
  </Anchor>
)

export const Nav = async () => {
  const count = await stars()
  return (
    <header className="relative z-10 border-b border-line">
      <div className={`${FRAME} flex h-[60px] items-center justify-between lg:h-[72px]`}>
        <Brand />
        <nav className="hidden items-center gap-9 lg:flex" aria-label="Main">
          {NAV.map(({ label, href }) => (
            <Anchor key={label} href={href} className="text-[14.5px] text-body transition-colors hover:text-ink">
              {label}
            </Anchor>
          ))}
        </nav>
        <div className="flex items-center gap-3.5 lg:gap-5">
          <Anchor
            href={REPO}
            className="hidden items-center gap-1.5 text-[14.5px] font-medium text-ink lg:flex"
            aria-label={count === undefined ? 'offprompt on GitHub' : `offprompt on GitHub, ${count} stars`}
          >
            <GitHubMark className="size-4" />
            {count}
          </Anchor>
          <Anchor
            href={PLAYGROUND.href}
            className="hidden rounded-lg bg-card px-4 py-2.5 text-sm font-medium text-ink outline outline-line -outline-offset-1 transition-colors hover:bg-panel lg:block"
          >
            {PLAYGROUND.label}
          </Anchor>
          <Anchor
            href="/#get-started"
            className="rounded-lg bg-brand px-3 py-2 text-[13px] font-medium text-white transition-colors hover:bg-ink lg:px-4 lg:py-2.5 lg:text-sm"
          >
            Get started
          </Anchor>
          <MobileMenu links={[PLAYGROUND, ...NAV]} />
        </div>
      </div>
    </header>
  )
}
