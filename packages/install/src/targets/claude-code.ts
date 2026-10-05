import { removeServer, upsertServer } from 'add-mcp'
import { join } from 'node:path'

import { attempt, onPath, run } from '../commands.js'
import { declareServer, undeclareServer } from '../files.js'
import { forAddMcp } from '../server.js'
import { NAME, type Server, type Target } from '../target.js'

const PLUGIN = `${NAME}@${NAME}`

/** Claude Code reads a project's servers from `.mcp.json`, and asks before starting them. */
const FILE = '.mcp.json'

/**
 * Where no `claude` is on `PATH` yet, as on a sandbox image being built, the server goes
 * into `~/.claude.json`, where Claude Code reads user-scope MCP servers.
 */
const declare = (server: Server) => {
  const result = upsertServer('claude-code', NAME, forAddMcp(server))
  return result.success
    ? Promise.resolve(`server in ${result.path}, since no claude is on PATH`)
    : Promise.reject(new Error(result.error ?? `could not write ${result.path}`))
}

/** Claude Code: a plugin through its plugin commands for you, `.mcp.json` for a project. */
export const claudeCode: Target = {
  agent: 'claude-code',
  label: 'Claude Code',
  detect: () => onPath('claude'),
  global: {
    method: 'plugin',
    install: async ({ plugin, server }) => {
      if (!(await onPath('claude'))) return declare(server)
      // Claude Code keeps a plugin at the version it installed, so offprompt is taken out and
      // put back to pick up new files, from a marketplace that points at this directory.
      await attempt('claude', ['plugin', 'uninstall', PLUGIN])
      await attempt('claude', ['plugin', 'marketplace', 'remove', NAME])
      await run('claude', ['plugin', 'marketplace', 'add', plugin])
      await run('claude', ['plugin', 'install', PLUGIN])
      return `plugin ${PLUGIN} from ${plugin}`
    },
    remove: async () => {
      const cli = await onPath('claude')
      const uninstalled = cli && (await attempt('claude', ['plugin', 'uninstall', PLUGIN]))
      if (cli) await attempt('claude', ['plugin', 'marketplace', 'remove', NAME])
      const undeclared = removeServer('claude-code', NAME)
      const removed = [
        ...(uninstalled ? [`plugin ${PLUGIN} uninstalled`] : []),
        ...(undeclared.removed ? [`server removed from ${undeclared.path}`] : []),
      ]
      return removed.length > 0 ? removed.join('; ') : undefined
    },
  },
  project: {
    file: FILE,
    install: async (root, { command, args, timeoutMs }) => {
      await declareServer(join(root, FILE), { type: 'stdio', command, args, timeout: timeoutMs })
      return `server in ${FILE}`
    },
    remove: async root => ((await undeclareServer(join(root, FILE))) ? `server removed from ${FILE}` : undefined),
  },
}
