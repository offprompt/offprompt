import { MAX_VALUE_LENGTH } from '../registry/checks.js'
import type { Rule } from '../registry/schema.js'
import type { GeneratedValue } from './store.js'
import { withArticle } from './wording.js'

/** How a generated key's random bytes are written out. */
export const ENCODINGS = ['base64url', 'base64', 'hex'] as const

export type Encoding = (typeof ENCODINGS)[number]

const HEX = '0123456789abcdef'

const base64Of = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes))

/** Random bytes written out as a generated key asks, the same way in the page and on the server. */
export const encodeBytes = (bytes: Uint8Array, encoding: Encoding) => {
  if (encoding === 'hex') return [...bytes].map(byte => `${HEX[byte >> 4] ?? ''}${HEX[byte & 15] ?? ''}`).join('')
  const padded = base64Of(bytes)
  return encoding === 'base64' ? padded : padded.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/** How many characters that many bytes come to. */
const lengthOf = ({ bytes, encoding }: Pick<GeneratedValue, 'bytes' | 'encoding'>) => {
  if (encoding === 'hex') return bytes * 2
  return encoding === 'base64' ? 4 * Math.ceil(bytes / 3) : Math.ceil((bytes * 4) / 3)
}

const CHARSETS: Readonly<Record<Encoding, { pattern: string; message: string }>> = {
  hex: { pattern: '^[0-9a-fA-F]*$', message: 'hex only · 0–9 and a–f' },
  base64: { pattern: '^[A-Za-z0-9+/]*={0,2}$', message: 'base64 only · letters, digits, + and /' },
  base64url: { pattern: '^[A-Za-z0-9_-]*$', message: 'base64url only · letters, digits, - and _' },
}

/**
 * What a key offprompt would generate is checked against when the human pastes their own:
 * as long as one it would make, in the same encoding.
 */
export const generatedRules = ({ bytes, encoding }: Pick<GeneratedValue, 'bytes' | 'encoding'>): readonly Rule[] => {
  const length = lengthOf({ bytes, encoding })
  const kind = encoding === 'hex' ? 'hex characters' : 'characters'
  return [
    {
      kind: 'length',
      min: length,
      max: MAX_VALUE_LENGTH,
      message: `at least ${String(length)} ${kind} · ${String(bytes)} bytes`,
    },
    { kind: 'charset', ...CHARSETS[encoding] },
  ]
}

/** What a pasted value that passes is taken to be. */
export const generatedSummary = ({ bytes, encoding }: Pick<GeneratedValue, 'bytes' | 'encoding'>) =>
  `Looks like ${withArticle(`${String(bytes)}-byte ${encoding} secret`)}`

/** What a value the page made itself says once it is in place. */
export const madeSummary = ({ bytes }: Pick<GeneratedValue, 'bytes'>) =>
  `Generated on this page from ${String(bytes)} random bytes`
