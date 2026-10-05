/** The plugin and the marketplace that serves it share one name. */
export const NAME = 'offprompt'

/** Where a project carries the server, relative to its root. */
export const BUNDLE = 'tools/offprompt/mcp.mjs'

/**
 * The launcher that starts the server, relative to the plugin's root, by which a folder
 * holding a plugin offprompt made is known. It stays out of `bin/`, whose files Claude Code
 * puts on the agent's PATH and which claude.ai refuses in a plugin.
 */
export const LAUNCHER = 'launcher/offprompt-mcp'

/** The server bundle in the plugin, relative to its root, which the launcher starts. */
export const PLUGIN_BUNDLE = 'dist/mcp.mjs'

/** Where plugins packaged before kept the launcher, so a folder holding one is known too. */
export const EARLIER_LAUNCHER = 'bin/offprompt-mcp'

/**
 * What an agent runs to start offprompt, in no agent's format yet. The installer decides it
 * once; each target only writes it the way its agent reads it.
 */
export type Server = {
  readonly command: string
  readonly args: readonly string[]
  /** How long one call may take: collect_secret waits while the human types. */
  readonly timeoutMs: number
}

/** How offprompt reaches an agent for this user, in every project. */
export type Global = {
  readonly method: 'plugin' | 'MCP config'
  /**
   * Installs from the packaged plugin directory, as a plugin or as the server it starts, and
   * says where offprompt went.
   */
  readonly install: (source: { readonly plugin: string; readonly server: Server }) => Promise<string>
  /** Takes offprompt out and says what went, or nothing when it was not there. */
  readonly remove: () => Promise<string | undefined>
}

/**
 * How offprompt reaches an agent in one project, for everyone who works on it: a config file
 * in the project that names the bundle beside it.
 */
export type Project = {
  /** The file the agent reads, relative to the project root. */
  readonly file: string
  readonly install: (root: string, server: Server) => Promise<string>
  readonly remove: (root: string) => Promise<string | undefined>
}

/** One agent offprompt can reach. */
export type Target = {
  /** What `--agent` takes: the agent's name as add-mcp knows it. */
  readonly agent: string
  readonly label: string
  readonly detect: () => Promise<boolean>
  readonly global: Global
  /** Absent where the agent reads no project config, or offprompt does not write one for it yet. */
  readonly project?: Project
}
