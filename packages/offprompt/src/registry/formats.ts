import { MAX_VALUE_LENGTH } from './checks.js'
import type { Format } from './schema.js'

/**
 * Kinds of value no single provider owns. A provider that can create a value of one of
 * these lists it among its offers, such as Supabase and Neon for `postgres_url`.
 */
export const formatList = [
  { id: 'text', rules: [] },
  {
    id: 'integer',
    label: 'whole number',
    rules: [{ kind: 'charset', pattern: '^-?[0-9]+$', message: 'a whole number' }],
  },
  {
    id: 'hex',
    label: 'hex string',
    rules: [
      { kind: 'charset', pattern: '^[0-9a-fA-F]*$', message: 'hexadecimal characters only, 0-9 and a-f' },
      { kind: 'length', min: 8, max: MAX_VALUE_LENGTH, message: 'at least 8 characters' },
    ],
  },
  {
    id: 'base64',
    label: 'base64 value',
    multiline: true,
    rules: [{ kind: 'format', format: 'base64', message: 'base64, padded to a multiple of 4 characters' }],
  },
  {
    id: 'email',
    label: 'email address',
    rules: [{ kind: 'format', format: 'email', message: 'an email address' }],
  },
  {
    id: 'url',
    label: 'URL',
    rules: [{ kind: 'format', format: 'url', message: 'a URL starting with http:// or https://' }],
  },
  {
    id: 'uuid',
    label: 'UUID',
    rules: [{ kind: 'format', format: 'uuid', message: 'a UUID, such as 123e4567-e89b-12d3-a456-426614174000' }],
  },
  {
    id: 'jwt',
    label: 'JWT',
    multiline: true,
    rules: [{ kind: 'format', format: 'jwt', message: 'a JWT, three base64url parts separated by dots' }],
  },
  {
    id: 'pem',
    label: 'PEM block',
    multiline: true,
    rules: [{ kind: 'format', format: 'pem', message: 'a PEM block, with its BEGIN and END lines' }],
  },
  {
    id: 'json',
    label: 'JSON document',
    multiline: true,
    rules: [{ kind: 'format', format: 'json', message: 'a valid JSON document' }],
  },
  {
    id: 'postgres_url',
    label: 'Postgres connection string',
    placeholder: 'postgresql://user:password@host/database',
    rules: [{ kind: 'format', format: 'postgres', message: 'a postgres:// or postgresql:// URL with a host' }],
  },
] as const satisfies readonly Format[]

export type FormatId = (typeof formatList)[number]['id']

/** The `format` enum on the tool. */
export const formatIds = formatList.map(format => format.id)

export const findFormat = (id: FormatId): Format => {
  const format = formatList.find(candidate => candidate.id === id)
  if (format === undefined) throw new Error(`no format ${id}`)
  return format
}
