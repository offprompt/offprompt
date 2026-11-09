import type { ReactNode } from 'react'

import { Anchor } from '@/components/anchor'
import { CopyCommand } from '@/components/copy-command'
import { FRAME } from '@/components/frame'
import { Faq, faqPage, LINK, Part, type Question, Rich } from '@/components/guide'
import { JsonLd } from '@/components/json-ld'
import { DopplerMark, InfisicalMark, OffpromptMark, OnePasswordMark, VaultMark } from '@/components/marks'
import { Shell } from '@/components/shell'
import { type Comparison, COMPARISONS, MODIFIED, type Row, type Sources } from '@/lib/comparisons'
import { COMPARE, INSTALL, REPO, SITE } from '@/lib/site'

/**
 * A tool's mark on a plain tile in the text colour, as the registry draws a logo with no brand
 * colour, so no tool stands out. Each mark is sized for its own viewBox to sit the same on the tile.
 */
const Tile = ({ children }: { readonly children: ReactNode }) => (
  <span
    className="flex size-9 shrink-0 items-center justify-center rounded-lg text-ink outline outline-line -outline-offset-1"
    aria-hidden="true"
  >
    {children}
  </span>
)

/** The competitor's mark, by the comparison's slug, each sized to sit the same on the tile. */
const CompetitorMark = ({ slug }: { readonly slug: Comparison['slug'] }) => {
  if (slug === 'offprompt-vs-hashicorp-vault') return <VaultMark className="size-5" />
  if (slug === 'offprompt-vs-doppler') return <DopplerMark className="size-[18px]" />
  if (slug === 'offprompt-vs-infisical') return <InfisicalMark className="h-3 w-6" />
  return <OnePasswordMark className="size-5" />
}

const OFFPROMPT = { '@type': 'Organization', name: 'offprompt', url: SITE }

/** The comparison as an article, for search engines and the assistants that read a page. */
const article = (page: Comparison) => ({
  '@context': 'https://schema.org',
  '@type': 'TechArticle',
  headline: page.title,
  description: page.description,
  url: `${SITE}${page.path}`,
  mainEntityOfPage: `${SITE}${page.path}`,
  dateModified: MODIFIED,
  author: OFFPROMPT,
  publisher: OFFPROMPT,
})

/** Where the page sits, for search results that show the path to a page. */
const breadcrumbs = (page: Comparison) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'offprompt', item: SITE },
    { '@type': 'ListItem', position: 2, name: 'Compare', item: `${SITE}${COMPARE.href}` },
    { '@type': 'ListItem', position: 3, name: page.title, item: `${SITE}${page.path}` },
  ],
})

/** The at-a-glance table: offprompt beside the other tool, a question a row. */
export const Table = ({ page, rows }: { readonly page: Comparison; readonly rows: readonly Row[] }) => (
  <div className="overflow-x-auto border-y border-line">
    <table className="w-full min-w-[640px] table-fixed border-collapse text-left text-[14px] leading-[21px] lg:text-[14.5px]">
      <thead>
        <tr className="border-b border-line">
          <th scope="col" className="w-[150px] py-3 pr-4 font-medium text-muted">
            <span className="sr-only">Question</span>
          </th>
          <th scope="col" className="py-3 pr-4 align-bottom font-medium text-ink">
            <span className="flex flex-col items-start gap-2.5">
              <Tile>
                <OffpromptMark className="h-2.5 w-5" />
              </Tile>
              offprompt
            </span>
          </th>
          <th scope="col" className="py-3 pr-4 align-bottom font-medium text-ink">
            <span className="flex flex-col items-start gap-2.5">
              <Tile>
                <CompetitorMark slug={page.slug} />
              </Tile>
              {page.competitor}
            </span>
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map(row => (
          <tr key={row.label} className="border-b border-line last:border-b-0">
            <th scope="row" className="py-3 pr-4 align-top font-medium text-ink">
              {row.label}
            </th>
            <td className="py-3 pr-4 align-top text-ink [overflow-wrap:anywhere]">
              <Rich text={row.offprompt} />
            </td>
            <td className="py-3 pr-4 align-top text-body [overflow-wrap:anywhere]">
              <Rich text={row.competitor} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)

/** The list of sources the page's facts about the other tool come from. */
export const SourceList = ({ competitor, sources, checked }: { readonly competitor: string; readonly sources: Sources; readonly checked: string }) => (
  <Part title="Sources">
    <p>What {competitor}&apos;s own docs say, as of {checked}.</p>
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
)

/** The other comparison pages, and the three-way one, so a reader of one finds the rest. */
const More = ({ page }: { readonly page: Comparison }) => (
  <Part title="Other comparisons">
    <ul className="flex flex-col gap-3">
      {COMPARISONS.filter(other => other.path !== page.path).map(other => (
        <li key={other.path} className="flex flex-col gap-1">
          <Anchor href={other.path} className={`${LINK} font-medium`}>
            {other.label}
          </Anchor>
          <span>{other.blurb}</span>
        </li>
      ))}
    </ul>
    <p>
      Or the three-way look at the MCP servers:{' '}
      <Anchor href={COMPARE.href} className={LINK}>
        offprompt vs 1Password Environments MCP vs Infisical MCP
      </Anchor>
      .
    </p>
  </Part>
)

type Props = {
  readonly page: Comparison
  /** The short answer, under the title. */
  readonly lede: ReactNode
  /** The at-a-glance table's rows. */
  readonly rows: readonly Row[]
  /** The page's bespoke parts, between the table and the sources. */
  readonly children: ReactNode
  readonly questions: readonly Question[]
  readonly sources: Sources
  /** When the other tool's docs were read, for the table's note and the sources. */
  readonly checked: string
}

/** A one-to-one comparison page: its title, short answer, the table, its parts, the FAQ and the sources. */
export const ComparePage = ({ page, lede, rows, children, questions, sources, checked }: Props) => (
  <Shell>
    {[article(page), faqPage(questions), breadcrumbs(page)].map((item, index) => (
      <JsonLd key={index} data={item} />
    ))}
    <article className={`${FRAME} flex flex-col gap-10 pt-16 pb-24 lg:pt-[104px] lg:pb-32`}>
      <div className="flex max-w-[760px] flex-col gap-6">
        <Anchor
          href={COMPARE.href}
          className="font-mono text-[11px] tracking-[1.2px] text-eyebrow hover:text-ink lg:text-xs"
        >
          COMPARE
        </Anchor>
        <h1 className="text-[36px] leading-[41px] tracking-[-1.2px] text-ink lg:text-[48px] lg:leading-[54px] lg:tracking-[-1.6px]">
          offprompt vs {page.competitor}
        </h1>
        <div className="flex flex-col gap-4 text-[17px] leading-7 text-body lg:text-xl lg:leading-8">{lede}</div>
      </div>

      <section className="flex flex-col gap-5">
        <h2 className="text-[22px] tracking-[-0.4px] text-ink lg:text-[26px]">At a glance</h2>
        <Table page={page} rows={rows} />
        <p className="text-[13.5px] text-muted lg:text-sm">
          What each tool&apos;s own docs say, as of {checked}. &ldquo;Not documented&rdquo; means its docs do not say.
        </p>
      </section>

      <div className="flex max-w-[680px] flex-col gap-10">
        {children}
        <SourceList competitor={page.competitor} sources={sources} checked={checked} />
        <Faq questions={questions} />
        <Part title="Try it">
          <p>
            In a project&apos;s folder, run the command below, then ask the agent for something that needs a key. The
            agent calls offprompt when it reaches the step that needs one.
          </p>
          <div>
            <CopyCommand command={INSTALL} />
          </div>
        </Part>
        <More page={page} />
      </div>
    </article>
  </Shell>
)
