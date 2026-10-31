import type { Service } from '@/lib/guides'
import { agent, provider } from '@/lib/registry'

import { LogoMark } from './logo'

/** A service's name and logo, from offprompt's registry, in its brand colour where it has one. */
const serviceOf = (service: Service) => {
  if ('agent' in service) return agent(service.agent)
  const { name, logo, color } = provider(service.provider)
  return { name, logo, color }
}

/** The services a guide uses, each as its logo and name in a small pill. */
export const Services = ({ uses, className = '' }: { readonly uses: readonly Service[]; readonly className?: string }) => (
  <ul className={`flex flex-wrap gap-2 ${className}`} aria-label="Uses">
    {uses.map(serviceOf).map(({ name, logo, color }) => (
      <li
        key={name}
        className="flex items-center gap-1.5 rounded-full bg-card py-1 pr-3 pl-2 text-[13px] leading-5 text-ink outline outline-line -outline-offset-1"
      >
        {logo !== undefined && <LogoMark logo={logo} color={color} className="size-3.5 shrink-0" />}
        {name}
      </li>
    ))}
  </ul>
)
