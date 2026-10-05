import { ArrowRight, Hourglass, Server, ShieldCheck } from 'lucide-react'
import type { ReactNode } from 'react'

import { SECURITY_NOTES } from '@/lib/site'

import { Anchor } from '../anchor'
import { RAILS } from '../frame'

const BADGE = '#5B625E'
const RING = '#3A3F3C'

/** 44 dots on a circle, as the "Nothing kept" badge draws its dotted rim. */
const DOTS = Array.from({ length: 44 }, (_, index) => {
  const angle = (index / 44) * 2 * Math.PI
  return { x: 76 + 73 * Math.cos(angle), y: 76 + 73 * Math.sin(angle) }
})

type BadgeProps = { readonly art: ReactNode; readonly children: ReactNode }

/** A 152px badge, shown at 70% below the large breakpoint, with its content centred on top. */
const Badge = ({ art, children }: BadgeProps) => (
  <div className="flex w-full justify-center">
    <div className="relative size-[106.4px] lg:size-[152px]">
      <div className="absolute top-0 left-0 size-[152px] origin-top-left scale-[0.7] lg:scale-100">
        <svg viewBox="0 0 152 152" className="size-full overflow-visible" aria-hidden="true">
          {art}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-dark-icon">{children}</div>
      </div>
    </div>
  </div>
)

type PointProps = {
  readonly title: string
  readonly children: ReactNode
  readonly badge: ReactNode
  readonly className: string
}

const Point = ({ title, children, badge, className }: PointProps) => (
  <div className={`flex flex-col gap-[22px] border-dark-line px-3.5 py-8 lg:gap-9 lg:px-8 lg:py-14 ${className}`}>
    {badge}
    <div className="flex flex-col gap-2.5">
      <h3 className="text-base font-medium text-dark-fg lg:text-[17px]">{title}</h3>
      <p className="text-[13.5px] leading-[21px] text-dark-body lg:text-[15px] lg:leading-6">{children}</p>
    </div>
  </div>
)

export const Security = () => (
  <section id="security" className="relative z-[1] scroll-mt-6 bg-dark">
    <div className={RAILS}>
      <div className="flex flex-col gap-10 border-x border-dark-line pt-[72px] lg:gap-16 lg:pt-32">
        <div className="flex flex-col gap-3.5 px-3 lg:flex-row lg:items-end lg:justify-between lg:px-8">
          <h2 className="text-[34px] leading-[38px] tracking-[-1px] text-dark-fg lg:text-5xl lg:leading-[53px] lg:tracking-[-1.4px]">
            From your browser
            <br />
            to the file.
          </h2>
          <p className="text-base leading-[25px] text-dark-body lg:max-w-[440px] lg:text-lg lg:leading-7">
            On your machine, the page is served from 127.0.0.1 and nothing leaves it. When the agent runs in a cloud
            sandbox, the page reaches you through a Cloudflare tunnel, and your browser encrypts the values first, to
            a key only the sandbox holds.
          </p>
        </div>
        <div className="grid grid-cols-2 border-y border-dark-line lg:grid-cols-4">
          <Point
            title="Runs beside the agent"
            className="border-r border-b lg:border-b-0"
            badge={
              <Badge
                art={
                  <>
                    <circle cx="76" cy="76" r="68.4" fill="none" stroke={BADGE} strokeWidth="15.2" />
                    <circle cx="76" cy="76" r="45.5" fill="none" stroke={RING} />
                  </>
                }
              >
                <Server className="size-5" aria-hidden="true" />
                <span className="font-mono text-[13.5px] font-medium">127.0.0.1</span>
              </Badge>
            }
          >
            One process on 127.0.0.1 wherever the agent runs, started by Claude Code, Cursor, Codex or anything else
            that speaks MCP.
          </Point>
          <Point
            title="Sealed over tunnels"
            className="border-b lg:border-r lg:border-b-0"
            badge={
              <Badge
                art={
                  <>
                    <circle cx="76" cy="76" r="75.25" fill="none" stroke={BADGE} strokeWidth="1.5" />
                    <circle cx="76" cy="76" r="57.5" fill="none" stroke={RING} />
                    {[
                      [76, 0],
                      [76, 152],
                      [0, 76],
                      [152, 76],
                    ].map(([cx, cy]) => (
                      <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="3" fill={BADGE} />
                    ))}
                  </>
                }
              >
                <ShieldCheck className="size-11" strokeWidth={1.5} aria-hidden="true" />
              </Badge>
            }
          >
            The page loads nothing from the network. From a sandbox, the tunnel only ever carries ciphertext.
          </Point>
          <Point
            title="Nothing kept"
            className="border-r"
            badge={
              <Badge
                art={
                  <>
                    {DOTS.map(({ x, y }) => (
                      <circle key={`${x.toFixed(2)}-${y.toFixed(2)}`} cx={x} cy={y} r="1.5" fill={BADGE} />
                    ))}
                    <circle cx="76" cy="76" r="53" fill="none" stroke={BADGE} strokeWidth="2" />
                    <circle cx="76" cy="76" r="39.5" fill="none" stroke={RING} />
                  </>
                }
              >
                <Hourglass className="size-[34px]" strokeWidth={1.5} aria-hidden="true" />
              </Badge>
            }
          >
            Values go into your file and nowhere else. The page holds nothing once the tab closes.
          </Point>
          <Point
            title="Open source"
            className=""
            badge={
              <Badge
                art={
                  <>
                    <circle cx="76" cy="76" r="75" fill="#1B1F1D" stroke={BADGE} strokeWidth="2" />
                    <circle cx="76" cy="76" r="63.5" fill="none" stroke={RING} />
                  </>
                }
              >
                <span className="text-[40px] leading-none font-semibold tracking-[-1px]">MIT</span>
                <span className="pt-1 font-mono text-[10px] tracking-[3px] text-dark-dim">LICENSE</span>
              </Badge>
            }
          >
            MIT licensed. Every line is on GitHub, and the package is on npm.
          </Point>
        </div>
        <div className="flex justify-center pb-14 lg:pb-[72px]">
          <Anchor
            href={SECURITY_NOTES}
            className="group flex items-center gap-2 text-[15px] font-medium text-dark-fg"
          >
            Read the security notes
            <ArrowRight
              className="size-4 transition-transform group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </Anchor>
        </div>
      </div>
    </div>
  </section>
)
