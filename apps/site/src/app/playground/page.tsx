import type { Metadata } from 'next'

import { Anchor } from '@/components/anchor'
import { FRAME } from '@/components/frame'
import { Shell } from '@/components/shell'
import { TryThePage } from '@/components/try-the-page'
import { pageMetadata } from '@/lib/metadata'
import { DOCS, INSTALL } from '@/lib/site'

export const metadata: Metadata = pageMetadata({
  path: '/playground',
  title: 'Playground · offprompt',
  description: "offprompt's own page, running in your browser: fill it, write, and compare the fingerprint.",
})

const LINK = 'text-ink underline decoration-line underline-offset-4 hover:decoration-ink'

const Playground = () => (
  <Shell>
    <div className={`${FRAME} flex flex-col gap-16 pt-16 pb-24 lg:gap-24 lg:pt-[104px] lg:pb-32`}>
      <TryThePage />
      <section className="flex max-w-[680px] flex-col gap-3 border-t border-line pt-8">
        <h2 className="text-[22px] tracking-[-0.4px] text-ink lg:text-[26px]">With your own agent</h2>
        <div className="flex flex-col gap-3 text-base leading-[26px] text-body lg:text-[17px] lg:leading-7">
          <p>
            In a real run, your coding agent calls offprompt with the keys it needs and why, and this page opens in
            your browser, served from <code>127.0.0.1</code> on your machine. From a cloud sandbox, the agent passes
            you a link to it instead.
          </p>
          <p>
            Each field checks its value as it goes in, and names the key you pasted when it recognises it, as the
            wrong Stripe key shows. When you press the write button, the values go into the file the agent named,
            usually <code>.env</code>, and the agent gets their names and the four emoji, never the values.
          </p>
          <p>
            Here a stand-in answers the write, so nothing is saved. To try it with your own agent, run{' '}
            <code>{INSTALL}</code> in a project, or read{' '}
            <Anchor href={`${DOCS}/first-secret`} className={LINK}>
              Your first secret
            </Anchor>
            .
          </p>
        </div>
      </section>
    </div>
  </Shell>
)

export default Playground
