import { clients, exampleFor, formats, type Logo, providers, type Provider, type Rule, type Sample } from 'offprompt/showcase'

/** A provider from offprompt's registry. A name it no longer has fails the build. */
export const provider = (id: string): Provider => {
  const found = providers.find(candidate => candidate.id === id)
  if (found === undefined) throw new Error(`offprompt's registry has no provider ${id}`)
  return found
}

/** A host from offprompt's list of the agents that ask, with its logo. */
export const agent = (id: string) => {
  const found = clients.find(candidate => candidate.id === id)
  if (found?.logo === undefined) throw new Error(`offprompt knows no agent ${id} with a logo`)
  return { name: found.name, logo: found.logo }
}

const prefixesOf = (rules: readonly Rule[]): readonly string[] =>
  rules.flatMap(rule => {
    if (rule.kind === 'prefix') return rule.anyOf
    if (rule.kind === 'either') return rule.options.flatMap(prefixesOf)
    return []
  })

/** The env name a project reads a value of this format under, when a provider only offers to make one. */
const FORMAT_KEYS: Readonly<Record<string, string>> = { postgres_url: 'DATABASE_URL' }

/** One provider as the site's registry explorer shows it. Plain data, for the page's script. */
export type RegistryEntry = {
  readonly id: string
  readonly name: string
  readonly logo?: Logo | undefined
  readonly color?: string | undefined
  /** The env name its key usually goes by. */
  readonly key: string
  /** The key at a glance: its prefix, or else what it is. */
  readonly shape: string
  /** How an agent asks for its key, for offprompt's page to draw the field. */
  readonly ask: Sample['asks'][number]
  /** A value its checks pass, plainly an example, for the field to start with. */
  readonly example: string
}

/** What a provider's key is asked as and checked against: its first credential, or the format it offers to make. */
const keyOf = (
  candidate: Provider,
): { ask: Sample['asks'][number]; rules: readonly Rule[]; example: string; placeholder?: string } => {
  const [first] = candidate.credentials
  if (first !== undefined) {
    return {
      ask: { name: first.names[0] ?? candidate.id, provider: `${candidate.id}/${first.id}` },
      rules: first.rules,
      example: exampleFor(first),
    }
  }
  const [offer] = candidate.offers
  const format = formats.find(each => each.id === offer?.format)
  if (offer === undefined || format === undefined) throw new Error(`${candidate.id} has no key and offers nothing`)
  return {
    ask: { name: FORMAT_KEYS[format.id] ?? format.id.toUpperCase(), format: format.id },
    rules: format.rules,
    example: exampleFor(format),
    ...('placeholder' in format ? { placeholder: format.placeholder } : {}),
  }
}

const entryOf = (candidate: Provider): RegistryEntry => {
  const { ask, rules, example, placeholder } = keyOf(candidate)
  const [prefix] = prefixesOf(rules)
  return {
    id: candidate.id,
    name: candidate.name,
    logo: candidate.logo,
    color: candidate.color,
    key: ask.name,
    shape: prefix === undefined ? (placeholder?.split('//')[0]?.concat('//…') ?? (rules[0]?.message ?? '')) : `${prefix}…`,
    ask,
    example,
  }
}

/** The order the list starts in. A provider the registry adds later joins at the end. */
const FIRST = ['stripe', 'openai', 'anthropic', 'github', 'supabase', 'vercel', 'resend', 'neon']

const rank = (id: string) => {
  const at = FIRST.indexOf(id)
  return at === -1 ? FIRST.length : at
}

/** Every provider in offprompt's registry, as the explorer lists them. */
export const registryEntries = (): readonly RegistryEntry[] =>
  [...providers].sort((a, b) => rank(a.id) - rank(b.id)).map(entryOf)
