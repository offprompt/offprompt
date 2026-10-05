import { agents, getAgentTypes, removeServer, upsertServer, type AgentType } from 'add-mcp'

import { forAddMcp } from '../server.js'
import { NAME, type Target } from '../target.js'

/**
 * Agents with a target of their own, and Claude Desktop, which has no project to write
 * into.
 */
const ELSEWHERE: ReadonlySet<string> = new Set(['claude-code', 'codex', 'cursor', 'pi', 'claude-desktop'])

/**
 * An agent that reads MCP servers from its own config file, written through add-mcp, for
 * you. add-mcp passes the timeout on where the agent takes one for a local server.
 */
const configTarget = (agent: AgentType): Target => ({
  agent,
  label: agents[agent].displayName,
  detect: () => agents[agent].detectGlobalInstall(),
  global: {
    method: 'MCP config',
    install: ({ server }) => {
      const result = upsertServer(agent, NAME, forAddMcp(server))
      return result.success
        ? Promise.resolve(`server in ${result.path}`)
        : Promise.reject(new Error(result.error ?? `could not write ${result.path}`))
    },
    remove: () => {
      const result = removeServer(agent, NAME)
      if (!result.success) return Promise.reject(new Error(result.error ?? `could not write ${result.path}`))
      return Promise.resolve(result.removed ? `server removed from ${result.path}` : undefined)
    },
  },
})

export const configTargets = getAgentTypes()
  .filter(agent => !ELSEWHERE.has(agent))
  .map(configTarget)
