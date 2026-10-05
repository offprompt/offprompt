import { INSTALL } from '@/lib/site'

import { CopyCommand } from '../copy-command'
import { FRAME } from '../frame'

export const Cta = () => (
  <section id="get-started" className="scroll-mt-6">
    <div className={`${FRAME} flex flex-col items-center pt-[72px] pb-20 text-center lg:pt-32 lg:pb-[136px]`}>
      <h2 className="text-[38px] leading-[42px] tracking-[-1.2px] text-ink lg:text-[56px] lg:leading-normal lg:tracking-[-1.8px]">
        Keep secrets off <br className="lg:hidden" />
        the prompt.
      </h2>
      <p className="pt-4 pb-8 text-[17px] text-body lg:pt-5 lg:pb-11 lg:text-xl">One command. Then forget it&apos;s there.</p>
      <CopyCommand command={INSTALL} />
      <p className="max-w-[440px] pt-4 text-[13px] text-muted lg:max-w-none lg:pt-[18px] lg:text-sm">
        It adds offprompt to every agent it finds: Claude Code, Codex, Cursor and Pi.
      </p>
    </div>
  </section>
)
