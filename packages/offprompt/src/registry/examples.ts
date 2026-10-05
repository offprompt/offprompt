import type { CheckName, Rule } from './schema.js'

/** Values of the named formats, each the smallest thing that is obviously an example. */
const FORMAT_EXAMPLES: Readonly<Record<CheckName, string>> = {
  email: 'you@example.com',
  url: 'https://example.com',
  uuid: '123e4567-e89b-12d3-a456-426614174000',
  jwt: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiZXhhbXBsZSJ9.ZXhhbXBsZS1zaWduYXR1cmU',
  base64: 'ZXhhbXBsZQ==',
  json: '{"example": true}',
  pem: '-----BEGIN PRIVATE KEY-----\nZXhhbXBsZQ==\n-----END PRIVATE KEY-----',
  postgres: 'postgresql://app:example@db.example.com:5432/app',
}

/** How long an example is when its rules allow any length from their minimum on. */
const PREFERRED_LENGTH = 40

/** What fills an example after its prefix, the most readable first, for rules that allow it. */
const FILLS = ['EXAMPLE0ffpr0mptK3yN0tRea1x9K2mQ7vL4pR8tW', 'x9K2mQ7vL4pR8tW1nZ5bC3dF6hJ0', '1234567890', '0123456789abcdef']

const lengthOf = (rules: readonly Rule[]) => {
  const bounds = rules.flatMap(rule => (rule.kind === 'length' ? [rule] : []))
  const min = Math.max(0, ...bounds.map(rule => rule.min))
  const max = Math.min(Number.MAX_SAFE_INTEGER, ...bounds.map(rule => rule.max))
  return Math.min(max, Math.max(min, PREFERRED_LENGTH))
}

/** A prefix the rules ask for, a test one where there is a choice, since examples are not live keys. */
const prefixOf = (rules: readonly Rule[]) => {
  const choices = rules.flatMap(rule => (rule.kind === 'prefix' ? rule.anyOf : []))
  return choices.find(choice => choice.includes('test')) ?? choices[0] ?? ''
}

const charsetsOf = (rules: readonly Rule[]) =>
  rules.flatMap(rule => (rule.kind === 'charset' ? [new RegExp(rule.pattern)] : []))

const repeated = ({ text, length }: { text: string; length: number }) =>
  length <= 0 ? '' : text.repeat(Math.ceil(length / text.length)).slice(0, length)

/**
 * A value that passes a key's or a format's rules and is plainly an example, for a field to
 * start with where offprompt's page is shown, not used. It is built from the rules themselves,
 * so it passes whatever they are now; the registry's tests hold every entry to that.
 */
export const exampleOf = (rules: readonly Rule[]): string => {
  const either = rules.find(rule => rule.kind === 'either')
  if (either !== undefined) return exampleOf(either.options[0] ?? [])
  const format = rules.find(rule => rule.kind === 'format')
  if (format !== undefined) return FORMAT_EXAMPLES[format.format]
  const prefix = prefixOf(rules)
  const length = lengthOf(rules)
  const charsets = charsetsOf(rules)
  const candidates = FILLS.map(fill => `${prefix}${repeated({ text: fill, length: length - prefix.length })}`)
  return candidates.find(value => charsets.every(charset => charset.test(value))) ?? candidates[0] ?? prefix
}

/** A key's or a format's example: its own where it has one, or else one made from its rules. */
export const exampleFor = ({ rules, example }: { readonly rules: readonly Rule[]; readonly example?: string | undefined }) =>
  example ?? exampleOf(rules)
