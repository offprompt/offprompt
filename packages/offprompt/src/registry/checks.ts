import type { CheckName, Rule } from './schema.js'

/** No real secret comes close, so anything longer is a slip of the clipboard. */
export const MAX_VALUE_LENGTH = 8192

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * A hostname with at least one dot, as zod's hostname check reads one: labels of letters,
 * digits and hyphens, none starting or ending with a hyphen. A scheme, a path, a port or an @
 * fails it, which is what a key asking for a bare host has to catch.
 */
const HOSTNAME = /^(?=.{1,253}$)[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/

const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/

const BASE64URL_SEGMENT = /^[A-Za-z0-9_-]+$/

const RULE_KINDS: ReadonlySet<string> = new Set(['prefix', 'length', 'charset', 'format', 'either'] satisfies Rule['kind'][])

const parses = (text: string) => {
  try {
    JSON.parse(text)
    return true
  } catch {
    return false
  }
}

const isHttpUrl = (value: string) => {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

/** A connection string names its host; `postgres://` alone is only the start of one. */
const isPostgresUrl = (value: string) => {
  try {
    const url = new URL(value)
    return (url.protocol === 'postgres:' || url.protocol === 'postgresql:') && url.hostname !== ''
  } catch {
    return false
  }
}

/** A JWT header decodes to a JSON object; three arbitrary dotted words do not. */
const isJwt = (value: string) => {
  const segments = value.split('.')
  const [header] = segments
  if (segments.length !== 3 || header === undefined) return false
  if (!segments.every(segment => BASE64URL_SEGMENT.test(segment))) return false
  try {
    const padded = header.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(header.length / 4) * 4, '=')
    const decoded: unknown = JSON.parse(atob(padded))
    return typeof decoded === 'object' && decoded !== null
  } catch {
    return false
  }
}

const CHECKED: Readonly<Record<CheckName, (value: string) => boolean>> = {
  email: value => EMAIL.test(value),
  url: isHttpUrl,
  hostname: value => HOSTNAME.test(value),
  uuid: value => UUID.test(value),
  jwt: isJwt,
  base64: value => {
    const compact = value.replace(/\s/g, '')
    return compact.length % 4 === 0 && BASE64.test(compact)
  },
  json: parses,
  pem: value => /-----BEGIN [A-Z0-9 ]+-----/.test(value) && /-----END [A-Z0-9 ]+-----/.test(value),
  postgres: isPostgresUrl,
}

type SingleRule = Exclude<Rule, { kind: 'either' }>

const passesSingle = (rule: SingleRule, value: string): boolean => {
  if (rule.kind === 'prefix') return rule.anyOf.some(prefix => value.startsWith(prefix))
  if (rule.kind === 'length') return value.length >= rule.min && value.length <= rule.max
  if (rule.kind === 'charset') return new RegExp(rule.pattern).test(value)
  return CHECKED[rule.format](value)
}

export const passes = (rule: Rule, value: string): boolean =>
  rule.kind === 'either'
    ? rule.options.some(option => option.every(inner => passesSingle(inner, value)))
    : passesSingle(rule, value)

/** Whether each rule holds for the value, in the order the rules are listed. */
export const check = (rules: readonly Rule[], value: string) => rules.map(rule => passes(rule, value))

/** The messages of the rules the value breaks, in order. Empty when it passes them all. */
export const failures = (rules: readonly Rule[], value: string) =>
  rules.filter(rule => !passes(rule, value)).map(rule => rule.message)

/** Whether data handed over from elsewhere has the shape of a rule. */
export const isRule = (value: unknown): value is Rule =>
  typeof value === 'object' && value !== null && 'kind' in value && RULE_KINDS.has(String(value.kind))
