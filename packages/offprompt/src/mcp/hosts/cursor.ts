import { isAbsolute } from 'node:path'

import type { Host } from '../host.js'

/** Where Cursor names its open folders, comma-separated, for a server it starts from an mcp.json. */
const FOLDERS = 'WORKSPACE_FOLDER_PATHS'

/** Cursor: its open folders arrive in the environment it starts offprompt with. */
export const cursor: Host = {
  name: 'cursor',
  workspacesIn: ({ env }) =>
    (env[FOLDERS] ?? '')
      .split(',')
      .map(path => path.trim())
      .filter(path => isAbsolute(path)),
}
