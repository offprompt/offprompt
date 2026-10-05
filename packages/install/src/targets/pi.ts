import { homedir } from 'node:os'
import { join } from 'node:path'

import { onPath } from '../commands.js'
import { declareServer, exists, undeclareServer, updateJson, withEntries } from '../files.js'
import type { Server, Target } from '../target.js'

/**
 * Pi speaks MCP through this extension. Pinned, since 3.0 moved the file it reads from
 * `mcp.json` to `mcp-adapter.json` from one day to the next.
 */
const ADAPTER = 'npm:pi-mcp-adapter@3.1.0'

/** The adapter's own config, which leaves `mcp.json` to Pi's built-in MCP when it comes. */
const FILE = 'mcp-adapter.json'

/** Where adapters before 3.0 read their config; an earlier install may have left offprompt there. */
const EARLIER = 'mcp.json'

/** Where Pi keeps its user settings, which `PI_CODING_AGENT_DIR` moves. */
const agentDir = () => process.env.PI_CODING_AGENT_DIR ?? join(homedir(), '.pi/agent')

/**
 * The server as the adapter reads it. It would otherwise put every server behind one proxy
 * tool, where the model would have to search for collect_secret before it could call it.
 */
const forAdapter = ({ command, args, timeoutMs }: Server) => ({
  command,
  args,
  requestTimeoutMs: timeoutMs,
  directTools: true,
})

const isAdapter = (entry: unknown) =>
  typeof entry === 'string' && (entry === 'npm:pi-mcp-adapter' || entry.startsWith('npm:pi-mcp-adapter@'))

/** Declares the pinned adapter in a Pi settings file, in place of any other version of it. */
const declareAdapter = (settings: string) =>
  updateJson(settings, config => withEntries(config, 'packages', [ADAPTER], isAdapter))

/** Declares offprompt for the adapter in a Pi folder, and takes it out of the file earlier adapters read. */
const declareIn = async (folder: string, server: Server) => {
  await declareServer(join(folder, FILE), forAdapter(server))
  await undeclareServer(join(folder, EARLIER))
  await declareAdapter(join(folder, 'settings.json'))
}

/** Takes offprompt out of a Pi folder, wherever an install of any version put it. */
const undeclareIn = async (folder: string) => {
  const removed = await Promise.all([FILE, EARLIER].map(file => undeclareServer(join(folder, file))))
  return removed.includes(true)
}

/** Pi, through pi-mcp-adapter: its agent directory for you, `.pi/` for a project. */
export const pi: Target = {
  agent: 'pi',
  label: 'Pi',
  detect: async () => (await onPath('pi')) || exists(agentDir()),
  global: {
    method: 'MCP config',
    install: async ({ server }) => {
      await declareIn(agentDir(), server)
      return `server in ${join(agentDir(), FILE)}, with ${ADAPTER}`
    },
    remove: async () => ((await undeclareIn(agentDir())) ? `server removed from ${join(agentDir(), FILE)}` : undefined),
  },
  project: {
    file: `.pi/${FILE}`,
    install: async (root, server) => {
      await declareIn(join(root, '.pi'), server)
      return `server in .pi/${FILE}, with ${ADAPTER} in .pi/settings.json`
    },
    remove: async root => ((await undeclareIn(join(root, '.pi'))) ? `server removed from .pi/${FILE}` : undefined),
  },
}
