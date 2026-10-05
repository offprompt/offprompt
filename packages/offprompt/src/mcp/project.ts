import { homedir } from 'node:os'
import { isAbsolute, parse, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

import { fail, ok, type Result } from '../core/result.js'
import type { Environment } from './host.js'
import { workspacesNamedIn } from './hosts.js'

/** A workspace root as a client names it over MCP. */
export type Root = { readonly uri: string }

const within = (parent: string, path: string) => {
  const rest = relative(parent, path)
  return rest === '' || (!rest.startsWith('..') && !isAbsolute(rest))
}

/** The directory a root points at, when it is one on this machine: a file URL, or a bare path. */
const directoryOf = (root: Root): readonly string[] => {
  if (isAbsolute(root.uri)) return [root.uri]
  if (!root.uri.startsWith('file:')) return []
  try {
    return [fileURLToPath(root.uri)]
  } catch {
    // A file URL naming another host.
    return []
  }
}

/**
 * Directories no project is: the folder offprompt is installed in, where Agent Plugins
 * clients start it, and the home and filesystem root directories, where desktop apps do.
 */
const isProjectless = ({ cwd, own }: { cwd: string; own: string }) =>
  within(own, cwd) || cwd === homedir() || cwd === parse(cwd).root

/**
 * Finds the project the agent works in, the directory sink paths resolve against. Asked
 * per request, since a client's roots can change during a session.
 *
 * The client's workspaces are its MCP roots, or those it names by a convention of its own,
 * in the call's `_meta` or the environment (see hosts/).
 * The working directory is the project when it lies inside one of them, as with Claude
 * Code, which starts offprompt in the project and names it as a root, or when the client
 * names none. Otherwise the first workspace is. Only the host sets either, never the
 * model, so a sink can be kept inside the project.
 */
export const projectFinder =
  ({
    cwd,
    own,
    listRoots,
    env = process.env,
  }: {
    cwd: string
    own: string
    listRoots: () => Promise<readonly Root[]>
    env?: Environment
  }) =>
  async ({ meta }: { meta?: unknown } = {}): Promise<Result<string>> => {
    const roots = [...(await listRoots()).flatMap(directoryOf), ...workspacesNamedIn({ meta, env })]
    const inProject = !isProjectless({ cwd, own })
    if (inProject && (roots.length === 0 || roots.some(root => within(root, cwd)))) return ok(cwd)
    const [first] = roots
    if (first !== undefined) return ok(first)
    return fail(
      `no project to write to: offprompt runs in ${cwd}, and your host named no workspace. Stop here and tell the user that offprompt could not tell which project this is, and that setting the offprompt server's working directory (cwd) to the project in their agent's MCP settings fixes it. Do not start offprompt or talk to its server yourself.`,
    )
  }
