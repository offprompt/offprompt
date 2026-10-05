export type Environment = Readonly<Record<string, string | undefined>>

/**
 * What a host conveys beyond the protocol, by a convention of its own. The core asks through
 * this, and a host with such a convention adds a file under hosts/.
 */
export type Host = {
  readonly name: string
  /**
   * The workspaces the host names: in a tool call's `_meta`, or in the environment it started
   * offprompt with. Absolute paths, the main one first. The host sets both, never the model.
   */
  readonly workspacesIn: (source: { readonly meta: unknown; readonly env: Environment }) => readonly string[]
}
