import { NAME } from './target.js'

/** A table header, `[...]` or `[[...]]`, at the start of a line. */
const HEADER = /^\s*\[/

/** offprompt's server table, or one of its subtables such as `.env`. */
const SERVER = new RegExp(`^\\s*\\[\\s*mcp_servers\\.(?:${NAME}|"${NAME}")(?:\\.[^\\]]*)?\\s*\\]`)

/**
 * The file without offprompt's server: each of its tables runs from its header to the next
 * header. Every other line stays as it was, comments included.
 */
export const withoutServer = (text: string) =>
  text
    .split('\n')
    .reduce<{ readonly skipping: boolean; readonly kept: readonly string[] }>(
      ({ skipping, kept }, line) => {
        if (SERVER.test(line)) return { skipping: true, kept }
        if (HEADER.test(line)) return { skipping: false, kept: [...kept, line] }
        return { skipping, kept: skipping ? kept : [...kept, line] }
      },
      { skipping: false, kept: [] },
    )
    .kept.join('\n')
    .trimEnd()

const string = (value: string) => JSON.stringify(value)

const list = (values: readonly string[]) => `[${values.map(string).join(', ')}]`

/** offprompt's server as a TOML table. */
export const serverTable = ({
  command,
  args,
  timeoutSec,
  envVars,
}: {
  command: string
  args: readonly string[]
  timeoutSec: number
  /** Variables the agent passes on from its own environment. */
  envVars: readonly string[]
}) =>
  [
    `[mcp_servers.${NAME}]`,
    `command = ${string(command)}`,
    `args = ${list(args)}`,
    `tool_timeout_sec = ${String(timeoutSec)}`,
    `env_vars = ${list(envVars)}`,
  ].join('\n')

/** The file with offprompt's server declared once, at the end. */
export const withServer = (text: string, table: string) => {
  const rest = withoutServer(text)
  return `${rest === '' ? '' : `${rest}\n\n`}${table}\n`
}
