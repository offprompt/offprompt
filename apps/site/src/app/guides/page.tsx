import { ArrowRight } from 'lucide-react'
import type { Metadata } from 'next'

import { Anchor } from '@/components/anchor'
import { FRAME } from '@/components/frame'
import { JsonLd } from '@/components/json-ld'
import { Services } from '@/components/services'
import { Shell } from '@/components/shell'
import { type Guide, GUIDE_PAGES, HUB, INDEX } from '@/lib/guides'
import { pageMetadata } from '@/lib/metadata'
import { DOCS, SITE } from '@/lib/site'

export const metadata: Metadata = pageMetadata(INDEX)

/** The guides that live in the docs, beside offprompt's own reference. */
const IN_THE_DOCS = [
  {
    title: 'How to give Claude Code an API key',
    description: 'Four ways to get a key to an agent, and what each keeps out of the chat and the transcript.',
    href: `${DOCS}/guides/claude-code-api-keys`,
  },
  {
    title: 'How to add API keys to Cursor without pasting them into chat',
    description: "Cursor's agent asks with offprompt, you type the key on a local page, and only its name reaches the agent.",
    href: `${DOCS}/guides/cursor-api-keys`,
  },
  {
    title: "How to keep secrets out of your AI agent's context",
    description: "Where secrets get into an agent's context, and how to keep each way closed.",
    href: `${DOCS}/guides/keep-secrets-out-of-agent-context`,
  },
] as const

/** The guides as a list, for search engines and the assistants that read a page. */
const COLLECTION = {
  '@context': 'https://schema.org',
  '@type': 'CollectionPage',
  name: INDEX.title,
  description: INDEX.description,
  url: `${SITE}${INDEX.path}`,
  mainEntity: {
    '@type': 'ItemList',
    itemListElement: GUIDE_PAGES.map((guide, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: guide.title,
      url: `${SITE}${guide.path}`,
    })),
  },
}

/** One guide: what it uses, its title, what it covers, and the way in. The first, about pasting a key, spans the row. */
const Card = ({ guide }: { readonly guide: Guide }) => (
  <Anchor
    href={guide.path}
    className={`group flex flex-col gap-4 rounded-[14px] bg-card p-6 shadow-[0_1px_2px_#12332A0D] outline outline-line -outline-offset-1 transition-colors hover:bg-panel lg:rounded-2xl lg:p-8 ${
      guide === HUB ? 'lg:col-span-3' : ''
    }`}
  >
    <Services uses={guide.uses} />
    <h2
      className={`text-ink ${
        guide === HUB
          ? 'text-[26px] leading-[32px] tracking-[-0.6px] lg:text-[34px] lg:leading-[40px] lg:tracking-[-1px]'
          : 'text-[21px] leading-[28px] tracking-[-0.4px] lg:text-[23px] lg:leading-[30px]'
      }`}
    >
      {guide.title}
    </h2>
    <p className={`text-[15px] leading-6 text-body lg:text-base lg:leading-[26px] ${guide === HUB ? 'max-w-[680px]' : ''}`}>
      {guide.description}
    </p>
    <span className="mt-auto flex items-center gap-2 pt-2 text-[15px] font-medium text-ink">
      Read the guide
      <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
    </span>
  </Anchor>
)

const Guides = () => (
  <Shell>
    <JsonLd data={COLLECTION} />
    <div className={`${FRAME} flex flex-col gap-12 pt-16 pb-24 lg:gap-16 lg:pt-[104px] lg:pb-32`}>
      <div className="flex max-w-[760px] flex-col gap-6">
        <h1 className="text-[44px] leading-[46px] tracking-[-1.6px] text-ink lg:text-[56px] lg:leading-[60px] lg:tracking-[-1.8px]">
          Guides
        </h1>
        <p className="text-[17px] leading-7 text-body lg:text-xl lg:leading-8">
          Sooner or later a coding agent asks for an API key. These guides say what happens when you paste one into
          the chat, and how to set up Resend, Stripe and Supabase so the agent can use a key it never sees: the
          narrowest key each one offers, offprompt to hand it over, and code that works.
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-3 lg:gap-5">
        {GUIDE_PAGES.map(guide => (
          <Card key={guide.path} guide={guide} />
        ))}
      </div>
      <section className="flex max-w-[680px] flex-col gap-5 border-t border-line pt-8">
        <h2 className="text-[22px] tracking-[-0.4px] text-ink lg:text-[26px]">In the docs</h2>
        <ul className="flex flex-col gap-5">
          {IN_THE_DOCS.map(({ title, description, href }) => (
            <li key={href} className="flex flex-col gap-1 text-base leading-[26px] text-body lg:text-[17px] lg:leading-7">
              <Anchor href={href} className="text-ink underline decoration-line underline-offset-4 hover:decoration-ink">
                {title}
              </Anchor>
              <span>{description}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  </Shell>
)

export default Guides
