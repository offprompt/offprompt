/** Stdout belongs to the JSON-RPC transport, so every diagnostic goes to stderr. */
export const note = (message: string) => {
  process.stderr.write(`offprompt: ${message}\n`)
}
