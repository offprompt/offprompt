import { join } from 'node:path'

import { BUNDLE, LAUNCHER, PLUGIN_BUNDLE, type Server } from './target.js'

/** collect_secret waits while the human types, for up to five minutes. */
const TIMEOUT_MS = 330_000

/** In a project: the bundle the project carries, by a path relative to its root. */
export const projectServer: Server = { command: 'node', args: [BUNDLE], timeoutMs: TIMEOUT_MS }

/**
 * For you: the launcher in the packaged plugin directory, which starts the bundle beside it.
 * Windows runs no sh script by itself, so there the bundle starts with node, which is what
 * the launcher would do on Windows anyway.
 */
export const globalServer = (plugin: string, platform: string = process.platform): Server =>
  platform === 'win32'
    ? { command: 'node', args: [join(plugin, PLUGIN_BUNDLE)], timeoutMs: TIMEOUT_MS }
    : { command: join(plugin, LAUNCHER), args: [], timeoutMs: TIMEOUT_MS }

/** The server as add-mcp takes it, which passes the timeout on where an agent has one. */
export const forAddMcp = ({ command, args, timeoutMs }: Server) => ({ command, args: [...args], timeout: timeoutMs })
