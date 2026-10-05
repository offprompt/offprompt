import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import { FRAME } from '@/components/frame'
import { Shell } from '@/components/shell'
import { REPO } from '@/lib/site'

export const metadata: Metadata = {
  title: 'Privacy · offprompt',
  description: 'What offprompt, offprompt.dev and docs.offprompt.dev do with your data.',
}

const Part = ({ title, children }: { readonly title: string; readonly children: ReactNode }) => (
  <section className="flex flex-col gap-3 border-t border-line pt-8">
    <h2 className="text-[22px] tracking-[-0.4px] text-ink lg:text-[26px]">{title}</h2>
    <div className="flex flex-col gap-3 text-base leading-[26px] text-body lg:text-[17px] lg:leading-7">{children}</div>
  </section>
)

const Privacy = () => (
  <Shell>
    <div className={`${FRAME} flex flex-col gap-10 pt-16 pb-24 lg:pt-[104px] lg:pb-32`}>
      <h1 className="text-[44px] leading-[46px] tracking-[-1.6px] text-ink lg:text-[56px] lg:leading-[60px] lg:tracking-[-1.8px]">
        Privacy
      </h1>
      <div className="flex max-w-[680px] flex-col gap-10">
        <Part title="offprompt">
          <p>
            offprompt runs on your machine, as a process your coding agent starts. It sends nothing to us, and we
            have no server for it to send to.
          </p>
          <p>
            A value you type goes from your browser to that process and into the file the agent named. The agent gets
            the key names and the file, never the values.
          </p>
          <p>
            In a cloud sandbox, the page reaches you through a Cloudflare quick tunnel. Your browser encrypts the
            values before they enter it, to a key made in the sandbox for that one request, so the tunnel carries
            only ciphertext. The first time it needs a tunnel, offprompt downloads <code>cloudflared</code> from
            Cloudflare&apos;s GitHub releases.
          </p>
        </Part>
        <Part title="offprompt.dev">
          <p>
            This site sets no cookies and runs no analytics. Vercel hosts it, and keeps the request logs any web server
            keeps.
          </p>
        </Part>
        <Part title="docs.offprompt.dev">
          <p>
            The documentation sets no cookies and runs no analytics either. It remembers whether you chose light or
            dark, and your recent searches, in your browser&apos;s own storage, which it never sends anywhere.
          </p>
        </Part>
        <Part title="Questions">
          <p>
            Open an issue on{' '}
            <a href={REPO} className="text-ink underline decoration-line underline-offset-4 hover:decoration-ink">
              GitHub
            </a>
            .
          </p>
        </Part>
      </div>
    </div>
  </Shell>
)

export default Privacy
