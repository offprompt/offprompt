import { isAbsolute } from 'node:path'

import { isRecord } from '../../core/guards.js'
import type { Host } from '../host.js'

/** Where Codex, which offers no MCP roots, names its workspaces on every tool call. */
const TURN = 'x-codex-turn-metadata'

/** Codex: its workspaces arrive in each tool call's `_meta`, keyed by path. */
export const codex: Host = {
  name: 'codex',
  workspacesIn: ({ meta }) => {
    const turn = isRecord(meta) ? meta[TURN] : undefined
    const workspaces = isRecord(turn) ? turn.workspaces : undefined
    return isRecord(workspaces) ? Object.keys(workspaces).filter(path => isAbsolute(path)) : []
  },
}
