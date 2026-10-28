import type { GeneratedValue, LinkOutcome, TypedValue } from '../core/store.js'
import { addressOf, inSentence } from '../core/wording.js'
import type { Source } from '../registry/registry.js'
import { fill } from '../registry/template.js'

/**
 * The link the agent gives a key: values for the parameters of the key's page in the registry,
 * or an https address of its own, for a key the registry does not know.
 */
export type AskedLink = string | Readonly<Record<string, string>>

/** Longer than any page where a key is made, and short enough to show whole. */
export const LINK_MAX = 2048

const dropped = (why: string): LinkOutcome => ({ kind: 'dropped', why })

const parsed = (text: string) => {
  try {
    return new URL(text)
  } catch {
    return undefined
  }
}

/**
 * An address of the agent's own, which the page shows as its suggestion and opens only once the
 * human confirms its host. It has to be https, and may not name a user before its host, as
 * `https://github.com@lookalike.example/` does to read as somewhere it is not.
 */
const suggestion = (text: string): LinkOutcome => {
  if (text.length > LINK_MAX) return dropped(`the link is longer than ${String(LINK_MAX)} characters`)
  const url = parsed(text.trim())
  if (url === undefined) return dropped('the link is not an address')
  if (url.protocol !== 'https:') return dropped('the link is not https, and the page only shows https links')
  if (url.username !== '' || url.password !== '') {
    return dropped('the link names a user or a password before its host, which hides where it goes')
  }
  return { kind: 'suggested', url: url.href, host: url.host }
}

/** The key's page in the registry, filled in with the agent's values, or why it keeps its usual page. */
const filledPage = ({
  name,
  values,
  source,
}: {
  name: string
  values: Readonly<Record<string, string>>
  source: Source | undefined
}): LinkOutcome => {
  if (source === undefined) {
    return dropped(
      `${name} is not a provider's key, so there is no page for parameters to fill; give the https address where it is made instead`,
    )
  }
  const { provider, credential } = source
  const usual = addressOf(credential.url)
  if (credential.template === undefined) {
    return dropped(`${provider.name}'s ${inSentence(credential.label)} has one page for everyone, ${usual}, which takes no parameters`)
  }
  const filled = fill({ template: credential.template, values, domains: provider.domains })
  if (!filled.ok) return dropped(`${filled.problems.join('; ')}, so Get it opens ${usual} instead`)
  return { kind: 'filled', url: filled.value.url, ignored: filled.value.ignored }
}

/**
 * What becomes of the link the agent gave a key. It never stops the request: a link that cannot
 * be used is dropped, the key keeps its usual page, and the result says why.
 */
export const linkFor = ({
  name,
  link,
  value,
}: {
  name: string
  link: AskedLink | undefined
  value: TypedValue | GeneratedValue
}): LinkOutcome | undefined => {
  if (link === undefined) return undefined
  if (value.kind === 'generated') return dropped(`${name} is generated on the page, so there is nothing to get`)
  return typeof link === 'string' ? suggestion(link) : filledPage({ name, values: link, source: value.source })
}
