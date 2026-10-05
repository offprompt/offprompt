import { checkField, type FieldRule } from '../../core/rules.js'
import { inSentence, withArticle } from '../../core/wording.js'

/** Where a rule's line stands: untouched, kept, broken, or not yet broken while the human types. */
export type LineState = 'idle' | 'pass' | 'fail' | 'pending'

export type Line = { readonly state: LineState; readonly detail: string }

/** A provider's key as the page knows it, to recognise a value pasted into the wrong field. */
export type KnownKey = {
  readonly ref: string
  readonly provider: string
  readonly label: string
  readonly url: string
  readonly prefixes: readonly string[]
}

const SCHEME = /^[a-z][a-z0-9+.-]{0,15}:\/\//i

/**
 * The start of a value that names what it is: a URL scheme such as `mysql://`, or a prefix
 * the page knows, from a provider's key or the field's own rule, such as `pk_live_`. Nothing
 * else, so no line ever repeats a stretch of a random secret, whatever it starts with.
 */
export const ownPrefix = ({ value, prefixes }: { value: string; prefixes: readonly string[] }) =>
  SCHEME.exec(value)?.[0] ??
  prefixes
    .filter(prefix => value.startsWith(prefix))
    .reduce((longest, prefix) => (prefix.length > longest.length ? prefix : longest), '')

/** The prefixes a rule allows, including those inside either of a choice's options. */
const prefixesOf = (rule: FieldRule): readonly string[] => {
  if (rule.kind === 'prefix') return rule.anyOf
  if (rule.kind !== 'either') return []
  return rule.options.flatMap(option => option.flatMap(inner => (inner.kind === 'prefix' ? inner.anyOf : [])))
}

/** Whether a value could still grow into one that starts right. */
const onTheWay = ({ rule, value }: { rule: FieldRule; value: string }) =>
  prefixesOf(rule).some(prefix => prefix.startsWith(value))

const failedLength = ({ rule, value, typing }: { rule: FieldRule & { kind: 'length' }; value: string; typing: boolean }) =>
  typing && value.length < rule.min
    ? { state: 'pending' as const, detail: `${String(value.length)} so far` }
    : { state: 'fail' as const, detail: `got ${String(value.length)}` }

const gotPrefix = ({ value, prefixes }: { value: string; prefixes: readonly string[] }) => {
  const prefix = ownPrefix({ value, prefixes })
  return prefix === '' ? '' : `got ${prefix}`
}

/** A URL-shaped check says which scheme it got; the others have nothing short and safe to say. */
const namesItsScheme = (rule: FieldRule) => rule.kind === 'format' && (rule.format === 'postgres' || rule.format === 'url')

/**
 * The state of one rule's line for a value, and what it adds after its message: how long
 * the value is, or the prefix it starts with, among the prefixes the page knows. While the
 * human is still typing, a value that is only short, or only part of the way into a prefix,
 * is not yet wrong.
 */
export const lineFor = ({
  rule,
  value,
  typing,
  known = [],
}: {
  rule: FieldRule
  value: string
  typing: boolean
  /** Prefixes of every provider key the page knows. */
  known?: readonly string[]
}): Line => {
  if (value === '') return { state: 'idle', detail: '' }
  if (checkField([rule], value)[0] === true) return { state: 'pass', detail: '' }
  if (rule.kind === 'length') return failedLength({ rule, value, typing })
  if (typing && onTheWay({ rule, value })) return { state: 'pending', detail: '' }
  if (rule.kind === 'prefix' || rule.kind === 'either' || namesItsScheme(rule)) {
    return { state: 'fail', detail: gotPrefix({ value, prefixes: [...known, ...prefixesOf(rule)] }) }
  }
  return { state: 'fail', detail: '' }
}

/**
 * The known key a value most likely is: the one whose prefix it matches longest. Where keys of
 * several providers share that prefix, as Stripe's and Clerk's pk_test_ do, one of the field's
 * own provider is the likelier slip; failing that, it could be any of them, and none is named.
 */
export const identify = ({
  value,
  known,
  own,
}: {
  value: string
  known: readonly KnownKey[]
  own?: KnownKey | undefined
}) => {
  const matches = known.flatMap(key =>
    key.prefixes.filter(prefix => value.startsWith(prefix)).map(prefix => ({ key, length: prefix.length })),
  )
  const longest = Math.max(0, ...matches.map(match => match.length))
  const best = matches.filter(match => match.length === longest).map(match => match.key)
  const ours = best.find(key => key.provider === own?.provider)
  if (ours !== undefined) return ours
  return new Set(best.map(key => key.provider)).size === 1 ? best[0] : undefined
}

/**
 * What to tell the human when a value that fails here is recognisably another key: the
 * sibling on the same dashboard page, another of the same provider's keys, or another
 * provider's key altogether.
 */
export const hintFor = ({
  value,
  own,
  known,
}: {
  value: string
  own: KnownKey | undefined
  known: readonly KnownKey[]
}) => {
  const match = identify({ value, known, own })
  if (match === undefined || match.ref === own?.ref) return ''
  if (own !== undefined && match.provider === own.provider) {
    return match.url === own.url
      ? `That's the ${inSentence(match.label)}. Use the ${inSentence(own.label)} from the same page.`
      : `That's the ${match.provider} ${inSentence(match.label)}, not the ${inSentence(own.label)}.`
  }
  return `This looks like ${withArticle(`${match.provider} ${inSentence(match.label)}`)}.`
}

const SPACES = /^\s|\s$/

/** A warning, not a problem: spaces at either end are written as typed unless trimmed. */
export const spaceNote = (value: string) => {
  if (!SPACES.test(value)) return ''
  const starts = /^\s/.test(value)
  const ends = /\s$/.test(value)
  const where = starts && ends ? 'Starts and ends with a space' : starts ? 'Starts with a space' : 'Ends with a space'
  return `${where}. It will be written exactly as typed unless you trim it.`
}
