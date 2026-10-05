import type { ReactNode } from 'react'

import { RAILS } from './frame'
import { Footer } from './sections/footer'
import { Nav } from './sections/nav'

/** The two hairlines that run down the page, either side of the content. */
const Rails = () => (
  <div className="pointer-events-none absolute inset-0 z-0" aria-hidden="true">
    <div className={`${RAILS} h-full`}>
      <div className="h-full border-x border-line" />
    </div>
  </div>
)

/** Every page's frame: the rails, the nav, the page, the footer. */
export const Shell = ({ children }: { readonly children: ReactNode }) => (
  <div className="relative overflow-x-clip">
    <Rails />
    <div className="relative z-[1]">
      <Nav />
      <main>{children}</main>
      <Footer />
    </div>
  </div>
)
