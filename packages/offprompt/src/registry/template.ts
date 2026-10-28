/**
 * A key's page inside one account, organisation or project, whose name or ID is part of its
 * address: `https://supabase.com/dashboard/project/{project}/settings/api-keys`. The agent
 * fills each parameter from the project. A value fills exactly one path segment or one
 * leading label of the host, and only takes characters that cannot end either, so it chooses
 * which of the provider's own pages opens and nothing else: never another path, a query or
 * another host.
 */

/** How a parameter is named in a template, and in what the agent passes. */
export const PARAM_NAME = /^[a-z][a-z0-9_]*$/

/** The longest value any parameter takes. */
export const PARAM_MAX = 100

/** The longest label a host can have, which a parameter filling one can be no longer than. */
export const LABEL_MAX = 63

/**
 * What a value in a path segment may hold. It starts with a letter or a digit, so it is never
 * `.` or `..`, which a browser would read as a step through the path rather than a segment.
 */
const SEGMENT_VALUE = /^[A-Za-z0-9][A-Za-z0-9._-]*$/

/** What a value in the host may hold: one DNS label, letters, digits and hyphens, a hyphen at neither end. */
const LABEL_VALUE = /^[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?$/

const PLACEHOLDER = /^\{([a-z][a-z0-9_]*)\}$/

const PLACEHOLDERS = /\{([a-z][a-z0-9_]*)\}/g

/** Where a parameter sits: a whole path segment, or a whole leading label of the host. */
export type Place = 'path' | 'host'

/** A template taken apart: where each parameter sits, and the host its fixed labels make. */
export type Shape = {
  readonly places: ReadonlyMap<string, Place>
  /** The host without the labels parameters fill. It must be on the provider's domains. */
  readonly fixedHost: string
  /** How many labels the host has, and how many segments the path. A filled address keeps both. */
  readonly labels: number
  readonly segments: number
}

/** A parameter's own rule, beyond the characters every parameter is held to. */
export type ParamRule = {
  readonly pattern?: string | undefined
  readonly message?: string | undefined
  readonly max: number
}

/** What filling a template needs: its address and each parameter's rule. */
export type Fillable = { readonly url: string; readonly params: Readonly<Record<string, ParamRule>> }

type Taken<T> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly problems: readonly string[] }

const taken = <T>(value: T): Taken<T> => ({ ok: true, value })

const refused = <T>(problems: readonly string[]): Taken<T> => ({ ok: false, problems })

const SCHEME = 'https://'

const hasBrace = (text: string) => /[{}]/.test(text)

const placeholderIn = (part: string) => PLACEHOLDER.exec(part)?.[1]

const duplicates = (names: readonly string[]) => names.filter((name, index) => names.indexOf(name) !== index)

/**
 * Takes a template apart without the URL parser, which would read its braces as part of the
 * address. A parameter is a whole segment or a whole label; one in the query or the fragment,
 * or in part of a segment, is refused.
 */
export const shapeOf = (template: string): Taken<Shape> => {
  if (!template.startsWith(SCHEME)) return refused([`${template} must start with https://`])
  const rest = template.slice(SCHEME.length)
  const hostEnd = rest.search(/[/?#]/)
  const authority = hostEnd === -1 ? rest : rest.slice(0, hostEnd)
  const after = hostEnd === -1 ? '' : rest.slice(hostEnd)
  const pathEnd = after.search(/[?#]/)
  // An address with no path has the path `/`, as the URL parser gives it.
  const path = (pathEnd === -1 ? after : after.slice(0, pathEnd)) || '/'
  const tail = pathEnd === -1 ? '' : after.slice(pathEnd)
  const labels = authority.split('.')
  const segments = path.split('/')
  const hostNames = labels.map(placeholderIn)
  const pathNames = segments.map(placeholderIn)
  const firstFixed = hostNames.findIndex(name => name === undefined)
  const problems = [
    ...(/[@:]/.test(authority) ? [`${template} names a user or a port, which a link to a provider's page never needs`] : []),
    ...(hasBrace(tail) ? [`${template} has a parameter in its query or fragment; parameters only fill a path segment or a host label`] : []),
    ...labels
      .filter(label => placeholderIn(label) === undefined && hasBrace(label))
      .map(label => `${template} has a parameter in part of the host label ${label}; it must be the whole label`),
    ...segments
      .filter(segment => placeholderIn(segment) === undefined && hasBrace(segment))
      .map(segment => `${template} has a parameter in part of the path segment ${segment}; it must be the whole segment`),
    ...(firstFixed === -1 ? [`${template} has no fixed part to its host`] : []),
    ...hostNames
      .slice(Math.max(firstFixed, 0))
      .filter(name => name !== undefined)
      .map(name => `${template} has {${name}} after a fixed label; host parameters only lead the host`),
    ...duplicates([...hostNames, ...pathNames].filter(name => name !== undefined)).map(
      name => `${template} uses {${name}} more than once`,
    ),
  ]
  if (problems.length > 0) return refused(problems)
  const places = new Map<string, Place>([
    ...hostNames.filter(name => name !== undefined).map(name => [name, 'host'] as const),
    ...pathNames.filter(name => name !== undefined).map(name => [name, 'path'] as const),
  ])
  return taken({ places, fixedHost: labels.slice(firstFixed).join('.'), labels: labels.length, segments: segments.length })
}

/** Whether a host is one of these domains, or a subdomain of one. */
export const onDomains = ({ hostname, domains }: { hostname: string; domains: readonly string[] }) =>
  domains.some(domain => hostname === domain || hostname.endsWith(`.${domain}`))

/** Why a value cannot fill its place, or undefined when it can. Said after the parameter's name. */
const problemOf = ({ rule, place, value }: { rule: ParamRule; place: Place; value: string }) => {
  if (value === '') return 'is empty'
  if (value.length > rule.max) return `is longer than ${String(rule.max)} characters`
  if (place === 'host' && !LABEL_VALUE.test(value)) {
    return 'takes letters, digits and hyphens only, as one part of a host name'
  }
  if (place === 'path' && !SEGMENT_VALUE.test(value)) {
    return 'takes letters, digits, ., _ and - only, starting with a letter or a digit'
  }
  if (rule.pattern !== undefined && !new RegExp(rule.pattern).test(value)) {
    return `must be ${rule.message ?? 'in the shape its key expects'}`
  }
  return undefined
}

/** Each value as it goes into the address: a host label in lower case, a path segment percent-encoded. */
const encoded = ({ place, value }: { place: Place; value: string }) =>
  place === 'host' ? value.toLowerCase() : encodeURIComponent(value)

const parsed = (address: string) => {
  try {
    return new URL(address)
  } catch {
    return undefined
  }
}

/** The template with each parameter replaced, unchecked. */
export const substituted = ({ url, values }: { url: string; values: ReadonlyMap<string, string> }) =>
  url.replace(PLACEHOLDERS, (whole, name: string) => values.get(name) ?? whole)

/**
 * Whether a filled address is still the page the template describes: https, on the provider's
 * domains, with as many host labels and path segments as the template has.
 */
const keepsShape = ({ address, shape, domains }: { address: URL | undefined; shape: Shape; domains: readonly string[] }) =>
  address !== undefined &&
  address.protocol === 'https:' &&
  address.username === '' &&
  address.password === '' &&
  onDomains({ hostname: address.hostname, domains }) &&
  address.hostname.split('.').length === shape.labels &&
  address.pathname.split('/').length === shape.segments

export type Filled = {
  readonly url: string
  /** Parameters the agent gave that the template does not take. They change nothing. */
  readonly ignored: readonly string[]
}

/**
 * The template filled with the agent's values. Every parameter must be given and fit its rule,
 * or nothing is filled and the key keeps its usual page; each problem names the parameter.
 */
export const fill = ({
  template,
  values,
  domains,
}: {
  template: Fillable
  values: Readonly<Record<string, string>>
  domains: readonly string[]
}): Taken<Filled> => {
  const shape = shapeOf(template.url)
  if (!shape.ok) return shape
  const names = [...shape.value.places.keys()]
  const problems = names.flatMap(name => {
    const value = values[name]
    const rule = template.params[name]
    const place = shape.value.places.get(name) ?? 'path'
    if (value === undefined) return [`${name} is missing`]
    if (rule === undefined) return [`${name} has no rule`]
    const problem = problemOf({ rule, place, value })
    return problem === undefined ? [] : [`${name} ${problem}`]
  })
  if (problems.length > 0) return refused(problems)
  const filledIn = new Map(
    names.map(name => [name, encoded({ place: shape.value.places.get(name) ?? 'path', value: values[name] ?? '' })]),
  )
  const address = parsed(substituted({ url: template.url, values: filledIn }))
  if (address === undefined || !keepsShape({ address, shape: shape.value, domains })) {
    return refused(['the filled address left the page its key links to'])
  }
  return taken({ url: address.href, ignored: Object.keys(values).filter(name => !shape.value.places.has(name)) })
}
