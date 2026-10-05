import { claude, cursor, pi } from './client-logos.js'
import { logo as github } from './providers/github/logo.js'
import { logo as openai } from './providers/openai/logo.js'
import type { Logo } from './schema.js'

/**
 * The programs that host an agent, as they introduce themselves in `clientInfo` at MCP
 * `initialize`. The host sets that name, not the model, so the page can say who is asking
 * without asking the agent. A host not listed here is shown under the name it gave.
 */
export type Client = {
  readonly id: string
  readonly name: string
  /** Matched, case-insensitively, against the start of `clientInfo.name`. */
  readonly matches: readonly string[]
  readonly logo?: Logo
  /** A brand colour the page tints the logo's badge with. */
  readonly color?: string
}

export const clients: readonly Client[] = [
  {
    id: 'claude-code',
    name: 'Claude Code',
    matches: ['claude-code', 'claude code', 'claude'],
    logo: claude,
    color: '#D97757',
  },
  { id: 'cursor', name: 'Cursor', matches: ['cursor'], logo: cursor },
  { id: 'codex', name: 'Codex', matches: ['codex'], logo: openai },
  { id: 'copilot', name: 'GitHub Copilot', matches: ['copilot', 'github'], logo: github },
  { id: 'windsurf', name: 'Windsurf', matches: ['windsurf'] },
  { id: 'cline', name: 'Cline', matches: ['cline'] },
  { id: 'zed', name: 'Zed', matches: ['zed'] },
  { id: 'gemini-cli', name: 'Gemini CLI', matches: ['gemini'] },
  { id: 'opencode', name: 'OpenCode', matches: ['opencode'] },
  // pi-mcp-adapter introduces itself per server, as pi-mcp-<server>.
  { id: 'pi', name: 'Pi', matches: ['pi-mcp', 'pi-coding-agent'], logo: pi },
]

const MAX_RAW_NAME = 40

/** Who is asking, as the page says it: a known client by its proper name, any other by the name it gave. */
export type Asker = { readonly name: string; readonly logo?: Logo; readonly color?: string; readonly via?: string }

/** The environment says which tool wraps the client, when one does. */
const viaOf = (env: Readonly<Record<string, string | undefined>>) =>
  env.CONDUCTOR_WORKSPACE_ID !== undefined && env.CONDUCTOR_WORKSPACE_ID !== '' ? 'Conductor' : undefined

export const askerFor = ({
  clientInfo,
  env = process.env,
}: {
  clientInfo: { readonly name: string } | undefined
  env?: Readonly<Record<string, string | undefined>>
}): Asker | undefined => {
  if (clientInfo === undefined || clientInfo.name.trim() === '') return undefined
  const given = clientInfo.name.trim()
  const lower = given.toLowerCase()
  const known = clients.find(client => client.matches.some(prefix => lower.startsWith(prefix)))
  const via = viaOf(env)
  const base =
    known === undefined
      ? { name: given.slice(0, MAX_RAW_NAME) }
      : {
          name: known.name,
          ...(known.logo === undefined ? {} : { logo: known.logo }),
          ...(known.color === undefined ? {} : { color: known.color }),
        }
  return { ...base, ...(via === undefined ? {} : { via }) }
}
