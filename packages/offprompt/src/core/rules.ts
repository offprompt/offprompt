import { MAX_VALUE_LENGTH, isRule, passes } from '../registry/checks.js'
import type { Rule } from '../registry/schema.js'
import { dotenvCanHold } from './dotenv.js'

/** offprompt's own check that a `.env` file can hold the value at all. */
type StorableRule = { readonly kind: 'storable'; readonly message: string }

/** A rule a field is checked against. A quiet one shows only once it fails, because it almost never does. */
export type FieldRule = (Rule | StorableRule) & { readonly quiet?: boolean }

const WITHIN_CAP: FieldRule = {
  kind: 'length',
  min: 0,
  max: MAX_VALUE_LENGTH,
  message: `no more than ${String(MAX_VALUE_LENGTH)} characters`,
  quiet: true,
}

const STORABLE_IN_DOTENV: FieldRule = {
  kind: 'storable',
  message: 'cannot be stored in a .env file: it mixes single and double quotes, or a single quote and a backslash',
  quiet: true,
}

/**
 * Every rule a field is checked against, in the order its lines appear: the value's own,
 * then the quiet ones that follow from where the value is going.
 */
export const fieldRules = ({
  rules,
  sinkKind,
}: {
  rules: readonly Rule[]
  sinkKind: 'dotenv' | 'file'
}): readonly FieldRule[] => [...rules, WITHIN_CAP, ...(sinkKind === 'dotenv' ? [STORABLE_IN_DOTENV] : [])]

const holds = (rule: FieldRule, value: string) => (rule.kind === 'storable' ? dotenvCanHold(value) : passes(rule, value))

/** Whether each rule holds for the value, in the order the rules are listed. */
export const checkField = (rules: readonly FieldRule[], value: string) => rules.map(rule => holds(rule, value))

/** The messages of the rules the value breaks, in order. Empty when it passes them all. */
export const fieldFailures = (rules: readonly FieldRule[], value: string) =>
  rules.filter(rule => !holds(rule, value)).map(rule => rule.message)

/** Whether data handed over by the server has the shape of a field rule. */
export const isFieldRule = (value: unknown): value is FieldRule =>
  isRule(value) || (typeof value === 'object' && value !== null && 'kind' in value && value.kind === 'storable')
