import { agent } from '@/lib/registry'

import { FRAME } from '../frame'
import { LogoMark } from '../logo'

/** The agents offprompt is tested with, by the logos its page shows them under. */
const AGENTS = ['claude-code', 'codex', 'cursor', 'pi'].map(agent)

/** The foot of the hero. */
export const WorksWith = () => (
  <div className={`${FRAME} flex flex-col items-center gap-6 pt-12 pb-12 lg:gap-9 lg:pt-20 lg:pb-20`}>
    <p className="text-sm text-body lg:text-base">Tested with</p>
    <ul className="grid grid-cols-2 gap-x-10 gap-y-5 sm:flex sm:flex-wrap sm:justify-center sm:gap-x-16 lg:gap-x-20">
      {AGENTS.map(({ name, logo }) => (
        <li key={name} className="flex items-center gap-2.5 text-faint lg:gap-3">
          <LogoMark logo={logo} className="size-6 shrink-0 lg:size-8" />
          <span className="text-[21px] leading-[30px] font-semibold tracking-[-0.5px] whitespace-nowrap lg:text-[28px] lg:leading-10 lg:tracking-[-0.8px]">
            {name}
          </span>
        </li>
      ))}
    </ul>
  </div>
)
