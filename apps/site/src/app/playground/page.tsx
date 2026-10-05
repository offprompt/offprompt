import type { Metadata } from 'next'

import { FRAME } from '@/components/frame'
import { Shell } from '@/components/shell'
import { TryThePage } from '@/components/try-the-page'

export const metadata: Metadata = {
  title: 'Playground · offprompt',
  description: "offprompt's own page, running in your browser: fill it, write, and compare the fingerprint.",
}

const Playground = () => (
  <Shell>
    <div className={`${FRAME} pt-16 pb-24 lg:pt-[104px] lg:pb-32`}>
      <TryThePage />
    </div>
  </Shell>
)

export default Playground
