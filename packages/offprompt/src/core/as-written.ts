import { parseDotenv } from './dotenv.js'

/**
 * A field that received its own `NAME=value` line — a paste with the page script off, say —
 * holds the value, not the line. Only an assignment to that field's own key is unwrapped,
 * so a value that merely contains `=` is left exactly as typed.
 */
const unwrapOwnLine = ({ name, value }: { name: string; value: string }) => {
  const entries = parseDotenv(value)
  const [only] = entries
  return entries.length === 1 && only?.key === name && only.value !== '' ? only.value : value
}

/**
 * A value as it will be written: a single-line one loses its line breaks, as a text input
 * would, and a field given its own line keeps only the value. The server applies it to
 * what arrives, and the page to what it fingerprints, so both take the same value.
 */
export const asWritten = ({ name, value, multiline }: { name: string; value: string; multiline: boolean }) =>
  unwrapOwnLine({ name, value: multiline ? value : value.replace(/[\r\n]/g, '') })
