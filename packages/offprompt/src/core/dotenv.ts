import { fail, ok, type Result } from './result.js'

export type DotenvWrite = { readonly contents: string; readonly overwrote: boolean }

/** One assignment, with the value as a dotenv reader resolves it. */
export type DotenvEntry = {
  readonly key: string
  readonly value: string
  readonly prefix: string
  readonly firstLine: number
  readonly lastLine: number
}

const ASSIGNMENT = /^(\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*)([\s\S]*)$/

/**
 * What a value can hold and still be written without quotes: characters a dotenv reader and a
 * shell that sources the file read the same way, the set Python's shlex.quote leaves bare.
 * Anything else, such as the `&` in a connection string's query, which a shell would take for
 * the end of the command, is quoted.
 */
const BARE_SAFE = /^[A-Za-z0-9_@%+=:,./-]+$/

type OpenEntry = {
  readonly key: string
  readonly prefix: string
  readonly quote: string
  readonly parts: readonly string[]
  readonly firstLine: number
}

type Fold = { readonly entries: readonly DotenvEntry[]; readonly open: OpenEntry | undefined }

/**
 * Index of the quote that closes a value, as dotenv finds it. A single-quoted value is
 * literal and ends at the next single quote. In the other two a backslash keeps the quote
 * after it from closing the value; escapes are blanked to same-length placeholders first,
 * so the index still refers to the original line.
 */
const closeAt = (line: string, quote: string) =>
  quote === "'" ? line.indexOf(quote) : line.replace(/\\[\s\S]/g, '\0\0').indexOf(quote)

/**
 * The value as dotenv hands it out: a bare one trimmed, a quoted one as written, except that
 * double quotes expand `\n` and `\r`. No other escape is undone, so a backslash in a value
 * survives the trip into the file and back.
 */
const resolved = ({ raw, quote }: { raw: string; quote: string }) => {
  if (quote === '') return raw.trim()
  return quote === '"' ? raw.replace(/\\n/g, '\n').replace(/\\r/g, '\r') : raw
}

const finish = ({
  open,
  tail,
  lastLine,
}: {
  open: OpenEntry
  tail: string
  lastLine: number
}): DotenvEntry => ({
  key: open.key,
  value: resolved({ raw: [...open.parts, tail].join('\n'), quote: open.quote }),
  prefix: open.prefix,
  firstLine: open.firstLine,
  lastLine,
})

const continueOpen = ({ open, line, index }: { open: OpenEntry; line: string; index: number }): Fold => {
  const end = closeAt(line, open.quote)
  if (end === -1) return { entries: [], open: { ...open, parts: [...open.parts, line] } }
  return { entries: [finish({ open, tail: line.slice(0, end), lastLine: index })], open: undefined }
}

const startEntry = ({ line, index }: { line: string; index: number }): Fold => {
  const match = ASSIGNMENT.exec(line)
  const prefix = match?.[1]
  const key = match?.[2]
  const rest = match?.[3]
  if (prefix === undefined || key === undefined || rest === undefined) return { entries: [], open: undefined }

  const quote = /^['"`]/.exec(rest)?.[0]
  if (quote === undefined) {
    const bare = /^[^#]*/.exec(rest)?.[0] ?? ''
    return {
      entries: [{ key, value: resolved({ raw: bare, quote: '' }), prefix, firstLine: index, lastLine: index }],
      open: undefined,
    }
  }

  const body = rest.slice(quote.length)
  const opened: OpenEntry = { key, prefix, quote, parts: [], firstLine: index }
  const end = closeAt(body, quote)
  if (end === -1) return { entries: [], open: { ...opened, parts: [body] } }
  return { entries: [finish({ open: opened, tail: body.slice(0, end), lastLine: index })], open: undefined }
}

/**
 * Parses the assignments in a dotenv file, folding a quoted value that runs over several
 * lines. A quote that is never closed is still returned as an entry running to the end of
 * the file, so a typo upstream cannot make the rest of the file invisible.
 */
export const parseDotenv = (contents: string): readonly DotenvEntry[] => {
  const lines = contents.split('\n')
  const folded = lines.reduce<Fold>(
    (state, line, index) => {
      const step =
        state.open === undefined ? startEntry({ line, index }) : continueOpen({ open: state.open, line, index })
      return { entries: [...state.entries, ...step.entries], open: step.open }
    },
    { entries: [], open: undefined },
  )
  if (folded.open === undefined) return folded.entries
  return [...folded.entries, finish({ open: folded.open, tail: '', lastLine: lines.length - 1 })]
}

/**
 * Single quotes come before double quotes for a one-line value, because a dotenv reader and a
 * shell both take them literally. A value carrying a newline is double-quoted with `\n` escapes,
 * which every reader expands, unless it also contains a double quote — a JSON document —
 * or a backslash, which a reader could take for an escape: then single quotes around real
 * newlines are the only form that survives. Double quotes never carry a backslash of the
 * value's own.
 */
const render = (value: string): Result<string> => {
  const multiline = /[\r\n]/.test(value)
  const plainForDoubleQuotes = !value.includes('"') && !value.includes('\\')
  if (!multiline && BARE_SAFE.test(value)) return ok(value)
  if (!multiline && !value.includes("'")) return ok(`'${value}'`)
  if (plainForDoubleQuotes) return ok(`"${value.replace(/\n/g, '\\n').replace(/\r/g, '\\r')}"`)
  if (!value.includes("'")) return ok(`'${value}'`)
  return fail(
    value.includes('"')
      ? 'that value mixes quote characters and cannot be stored in a .env file'
      : 'that value has a single quote and a backslash, which a .env file cannot hold together',
  )
}

/** Whether some dotenv form can carry the value back out exactly as it went in. */
export const dotenvCanHold = (value: string) => render(value).ok

/** True when the file already assigns `name`, so the form can say "overwrite". */
export const dotenvHasKey = (contents: string, name: string) =>
  parseDotenv(contents).some(entry => entry.key === name)

/**
 * Upserts `name` and leaves every other line byte-identical. The first assignment of
 * `name` is replaced whole — every line of it, when its value spans several — and later
 * duplicates are dropped, so no parser can still resolve the previous value.
 */
export const upsertDotenv = ({
  contents,
  name,
  value,
}: {
  contents: string
  name: string
  value: string
}): Result<DotenvWrite> => {
  const rendered = render(value)
  if (!rendered.ok) return rendered

  const lines = contents === '' ? [] : contents.replace(/\n$/, '').split('\n')
  const [first, ...rest] = parseDotenv(lines.join('\n')).filter(entry => entry.key === name)
  if (first === undefined) {
    return ok({ contents: `${[...lines, `${name}=${rendered.value}`].join('\n')}\n`, overwrote: false })
  }

  const dropped = new Set(
    [first, ...rest].flatMap(entry =>
      Array.from({ length: entry.lastLine - entry.firstLine + 1 }, (_, offset) => entry.firstLine + offset),
    ),
  )
  const kept = lines.flatMap((line, index) => {
    if (index === first.firstLine) return [`${first.prefix}${rendered.value}`]
    return dropped.has(index) ? [] : [line]
  })
  return ok({ contents: `${kept.join('\n')}\n`, overwrote: true })
}
