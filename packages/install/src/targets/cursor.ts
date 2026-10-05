import { cp, mkdir, rm } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'

import { declareServer, exists, undeclareServer } from '../files.js'
import { NAME, type Target } from '../target.js'

/** Where Cursor loads a plugin nobody published from, one folder per plugin. */
const local = () => join(homedir(), '.cursor/plugins/local', NAME)

const FILE = '.cursor/mcp.json'

/** Cursor: a copy of the plugin in its local plugins folder for you, `.cursor/mcp.json` for a project. */
export const cursor: Target = {
  agent: 'cursor',
  label: 'Cursor',
  detect: () => exists(join(homedir(), '.cursor')),
  global: {
    method: 'plugin',
    install: async ({ plugin }) => {
      await rm(local(), { recursive: true, force: true })
      await mkdir(dirname(local()), { recursive: true })
      await cp(plugin, local(), { recursive: true })
      return `plugin in ${local()}`
    },
    remove: async () => {
      const installed = await exists(local())
      await rm(local(), { recursive: true, force: true })
      return installed ? `removed ${local()}` : undefined
    },
  },
  project: {
    file: FILE,
    install: async (root, { command, args }) => {
      await declareServer(join(root, FILE), { command, args })
      return `server in ${FILE}`
    },
    remove: async root => ((await undeclareServer(join(root, FILE))) ? `server removed from ${FILE}` : undefined),
  },
}
