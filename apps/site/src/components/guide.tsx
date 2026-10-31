import type { ReactNode } from 'react'

import { Anchor } from '@/components/anchor'
import { CopyCommand } from '@/components/copy-command'
import { FRAME } from '@/components/frame'
import { JsonLd } from '@/components/json-ld'
import { Shell } from '@/components/shell'
import { CHECKED, type Guide, GUIDE_PAGES, MODIFIED } from '@/lib/guides'
import { INSTALL, REPO, SITE } from '@/lib/site'

export const LINK = 'text-ink underline decoration-line underline-offset-4 hover:decoration-ink'

/** Code between backticks, or a link written [like this](https://example.com). */
const MARKUP = /(`[^`]+`|\[[^\]]+\]\([^)\s]+\))/

const LINKED = /^\[([^\]]+)\]\(([^)\s]+)\)$/

/** Text with its code set as code and its links as links, for the steps and answers kept as strings. */
export const Rich = ({ text }: { readonly text: string }) =>
  text.split(MARKUP).map((part, index) => {
    if (index % 2 === 0) return part
    const link = LINKED.exec(part)
    return link === null ? (
      <code key={index}>{part.slice(1, -1)}</code>
    ) : (
      <Anchor key={index} href={link[2] ?? ''} className={LINK}>
        {link[1]}
      </Anchor>
    )
  })

/** The same text as a search engine's structured data takes it: the words, without the markup. */
export const plain = (text: string) =>
  text.split(MARKUP).map((part, index) => (index % 2 === 0 ? part : (LINKED.exec(part)?.[1] ?? part.slice(1, -1)))).join('')

export const Part = ({ id, title, children }: { readonly id?: string; readonly title: string; readonly children: ReactNode }) => (
  <section id={id} className="flex scroll-mt-6 flex-col gap-3 border-t border-line pt-8">
    <h2 className="text-[22px] tracking-[-0.4px] text-ink lg:text-[26px]">{title}</h2>
    <div className="flex flex-col gap-3 text-base leading-[26px] text-body lg:text-[17px] lg:leading-7 [&_code]:[overflow-wrap:anywhere]">{children}</div>
  </section>
)

/** A block of code, with the file it goes in above it when it has one. */
export const Code = ({ file, children }: { readonly file?: string; readonly children: string }) => (
  <figure className="overflow-hidden rounded-xl bg-card outline outline-line -outline-offset-1">
    {file !== undefined && (
      <figcaption className="border-b border-line px-4 py-2 font-mono text-[12.5px] text-muted">{file}</figcaption>
    )}
    <pre className="overflow-x-auto px-4 py-3.5 font-mono text-[12.5px] leading-[20px] text-ink lg:text-[13.5px] lg:leading-[22px]">
      <code>{children.trim()}</code>
    </pre>
  </figure>
)

export type Step = {
  readonly name: string
  /** What to do, with code in backticks and links in brackets. */
  readonly text: string
  readonly code?: readonly { readonly file?: string; readonly text: string }[]
  /** What follows the code, such as a caution. */
  readonly after?: string
  /** A picture of the step, such as the terminal it happens in. */
  readonly picture?: ReactNode
}

/** A guide's steps, numbered, each with its code. */
export const Steps = ({ steps }: { readonly steps: readonly Step[] }) => (
  <ol className="flex flex-col gap-8">
    {steps.map((step, index) => (
      <li key={step.name} id={`step-${index + 1}`} className="flex scroll-mt-6 flex-col gap-3">
        <h3 className="flex items-baseline gap-3 text-[17px] font-medium text-ink lg:text-lg">
          <span className="font-mono text-[13px] text-eyebrow lg:text-sm" aria-hidden="true">
            {String(index + 1).padStart(2, '0')}
          </span>
          {step.name}
        </h3>
        <p>
          <Rich text={step.text} />
        </p>
        {step.code?.map(({ file, text }) => (
          <Code key={text} {...(file === undefined ? {} : { file })}>
            {text}
          </Code>
        ))}
        {step.after !== undefined && (
          <p>
            <Rich text={step.after} />
          </p>
        )}
        {step.picture}
      </li>
    ))}
  </ol>
)

export type Question = { readonly question: string; readonly answer: string }

export const Faq = ({ questions }: { readonly questions: readonly Question[] }) => (
  <Part id="faq" title="FAQ">
    {questions.map(({ question, answer }) => (
      <div key={question} className="flex flex-col gap-1.5 pt-2">
        <h3 className="text-[17px] font-medium text-ink lg:text-lg">{question}</h3>
        <p>
          <Rich text={answer} />
        </p>
      </div>
    ))}
  </Part>
)

const OFFPROMPT = { '@type': 'Organization', name: 'offprompt', url: SITE }

/** The guide as an article, for search engines and the assistants that read a page. */
export const article = (guide: Guide) => ({
  '@context': 'https://schema.org',
  '@type': 'TechArticle',
  headline: guide.title,
  description: guide.description,
  url: `${SITE}${guide.path}`,
  mainEntityOfPage: `${SITE}${guide.path}`,
  dateModified: MODIFIED,
  author: OFFPROMPT,
  publisher: OFFPROMPT,
})

export const faqPage = (questions: readonly Question[]) => ({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: questions.map(({ question, answer }) => ({
    '@type': 'Question',
    name: question,
    acceptedAnswer: { '@type': 'Answer', text: plain(answer) },
  })),
})

/** The guide's steps as a how-to, taken from the steps the page shows so the two cannot drift. */
export const howTo = (guide: Guide, steps: readonly Step[]) => ({
  '@context': 'https://schema.org',
  '@type': 'HowTo',
  name: guide.title,
  description: guide.description,
  url: `${SITE}${guide.path}`,
  step: steps.map((step, index) => ({
    '@type': 'HowToStep',
    position: index + 1,
    name: step.name,
    text: plain(step.text),
    url: `${SITE}${guide.path}#step-${index + 1}`,
  })),
})

type Sources = readonly { readonly label: string; readonly href: string }[]

/** The other guides, so a reader of one finds the rest. */
const More = ({ guide }: { readonly guide: Guide }) => (
  <Part title="More guides">
    <ul className="flex flex-col gap-2">
      {GUIDE_PAGES.filter(other => other.path !== guide.path).map(other => (
        <li key={other.path}>
          <Anchor href={other.path} className={LINK}>
            {other.title}
          </Anchor>
        </li>
      ))}
    </ul>
  </Part>
)

type Props = {
  readonly guide: Guide
  /** The short answer, under the title. */
  readonly lede: ReactNode
  /** The guide's main picture, the width of the page, under the short answer. */
  readonly shot?: ReactNode
  readonly data: readonly object[]
  /** Where the provider's facts come from. */
  readonly sources?: Sources
  readonly children: ReactNode
}

/** A guide's page: its title and short answer, its parts, where its facts come from, and the other guides. */
export const GuidePage = ({ guide, lede, shot, data, sources, children }: Props) => (
  <Shell>
    {data.map((item, index) => (
      <JsonLd key={index} data={item} />
    ))}
    <article className={`${FRAME} flex flex-col gap-10 pt-16 pb-24 lg:pt-[104px] lg:pb-32`}>
      <div className="flex max-w-[760px] flex-col gap-6">
        <p className="font-mono text-[11px] tracking-[1.2px] text-eyebrow lg:text-xs">GUIDE</p>
        <h1 className="text-[36px] leading-[41px] tracking-[-1.2px] text-ink lg:text-[48px] lg:leading-[54px] lg:tracking-[-1.6px]">
          {guide.title}
        </h1>
        <div className="flex flex-col gap-4 text-[17px] leading-7 text-body lg:text-xl lg:leading-8">{lede}</div>
      </div>
      {shot}
      <div className="flex max-w-[680px] flex-col gap-10">
        {children}
        {sources !== undefined && (
          <Part title="Sources">
            <p>What the provider&apos;s own docs say, as of {CHECKED}.</p>
            <ul className="flex list-disc flex-col gap-2 pl-5">
              {sources.map(source => (
                <li key={source.href}>
                  <Anchor href={source.href} className={LINK}>
                    {source.label}
                  </Anchor>
                </li>
              ))}
            </ul>
            <p>
              Something here out of date? Open an issue on{' '}
              <Anchor href={`${REPO}/issues`} className={LINK}>
                GitHub
              </Anchor>
              .
            </p>
          </Part>
        )}
        <Part title="Try it">
          <p>
            In a project&apos;s folder, run the command below, then ask the agent for something that needs a key.
          </p>
          <div>
            <CopyCommand command={INSTALL} />
          </div>
        </Part>
        <More guide={guide} />
      </div>
    </article>
  </Shell>
)
