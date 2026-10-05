import type { Environment, Host } from './host.js'
import { codex } from './hosts/codex.js'
import { cursor } from './hosts/cursor.js'

/** Hosts with conventions of their own beyond the protocol. */
export const HOSTS: readonly Host[] = [codex, cursor]

/** The workspaces the host names, by whichever convention it follows. */
export const workspacesNamedIn = ({ meta, env = process.env }: { meta: unknown; env?: Environment }) =>
  HOSTS.flatMap(host => host.workspacesIn({ meta, env }))
