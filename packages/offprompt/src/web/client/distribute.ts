import { parseDotenv } from '../../core/dotenv.js'

export type Distribution = {
  readonly fills: ReadonlyMap<string, string>
  readonly ignored: readonly string[]
}

/**
 * Reads pasted text as dotenv and pairs it with the keys the page asked for. A paste that
 * names none of them is not a batch, so it is left to land in the field as it was typed:
 * a bare key that happens to contain `=` stays a bare key.
 */
export const distribute = ({
  text,
  names,
}: {
  text: string
  names: readonly string[]
}): Distribution | undefined => {
  const wanted = new Set(names)
  const entries = parseDotenv(text).filter(entry => entry.value !== '')
  const matched = entries.filter(entry => wanted.has(entry.key))
  if (matched.length === 0) return undefined
  return {
    fills: new Map(matched.map(entry => [entry.key, entry.value])),
    ignored: [...new Set(entries.filter(entry => !wanted.has(entry.key)).map(entry => entry.key))],
  }
}
