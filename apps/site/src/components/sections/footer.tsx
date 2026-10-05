import { FOOTER, NPM, REPO } from '@/lib/site'

import { Anchor } from '../anchor'
import { FRAME } from '../frame'
import { OffpromptMark } from '../marks'

export const Footer = () => (
  <footer className="border-t border-line">
    <div className={`${FRAME} flex flex-col gap-10 pt-12 pb-10 lg:gap-16 lg:pt-[72px] lg:pb-14`}>
      <div className="flex flex-col gap-9 lg:flex-row lg:gap-8">
        <div className="flex flex-1 flex-col gap-4">
          <Anchor href="/" className="flex w-fit items-center gap-2.5 text-ink" aria-label="offprompt, home">
            <OffpromptMark className="h-4 w-8" />
            <span className="text-lg font-medium tracking-[-0.4px]">offprompt</span>
          </Anchor>
          <p className="max-w-[280px] text-[14.5px] leading-[22px] text-body">
            An MCP server beside your agent. The secret goes around the conversation.
          </p>
        </div>
        <div className="flex gap-4 lg:gap-8">
          {FOOTER.map(({ head, links }) => (
            <nav key={head} className="flex flex-1 flex-col gap-3 lg:w-[200px] lg:flex-none lg:gap-3.5" aria-label={head}>
              <h3 className="text-sm font-medium text-ink lg:text-[14.5px]">{head}</h3>
              {links.map(({ label, href }) => (
                <Anchor key={label} href={href} className="text-sm text-body transition-colors hover:text-ink lg:text-[14.5px]">
                  {label}
                </Anchor>
              ))}
            </nav>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-between border-t border-line pt-6 text-[13.5px] text-muted">
        <span>© 2026 offprompt</span>
        <span className="flex gap-6">
          <Anchor href={REPO} className="transition-colors hover:text-ink">
            GitHub
          </Anchor>
          <Anchor href={NPM} className="transition-colors hover:text-ink">
            npm
          </Anchor>
        </span>
      </div>
    </div>
  </footer>
)
