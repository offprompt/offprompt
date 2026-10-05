import { rm } from 'node:fs/promises'
import { join } from 'node:path'

import { attempt, onPath, run } from '../commands.js'
import { readIfPresent, writeText } from '../files.js'
import { NAME, type Target } from '../target.js'
import { serverTable, withServer, withoutServer } from '../toml.js'

const PLUGIN = `${NAME}@${NAME}`

/** Codex reads a project's servers from here once the project is trusted. */
const FILE = '.codex/config.toml'

/**
 * What Codex passes offprompt from its own environment, on top of the few variables it gives
 * every MCP server. The plugin's Codex manifest names the same ones.
 */
export const FORWARDED = [
  // Where offprompt runs: a Linux desktop, an SSH session or a codespace.
  'DISPLAY',
  'WAYLAND_DISPLAY',
  'SSH_CONNECTION',
  'CODESPACES',
  // What xdg-open needs to find the person's browser and reach it.
  'XDG_RUNTIME_DIR',
  'XDG_CURRENT_DESKTOP',
  'XDG_DATA_DIRS',
  'DBUS_SESSION_BUS_ADDRESS',
  'BROWSER',
  // offprompt's own setting, where it keeps cloudflared, and the app the page names.
  'OFFPROMPT_TUNNEL',
  'XDG_CACHE_HOME',
  'CONDUCTOR_WORKSPACE_ID',
] as const

/**
 * Codex: a plugin through its plugin commands for you, `.codex/config.toml` for a project. It
 * reads the plugin directory as a marketplace and loads offprompt from its own manifest,
 * `.codex-plugin/plugin.json`, the one of the plugin's manifests that can name variables to
 * pass on.
 */
export const codex: Target = {
  agent: 'codex',
  label: 'Codex',
  detect: () => onPath('codex'),
  global: {
    method: 'plugin',
    install: async ({ plugin }) => {
      // Codex copies a plugin into its cache when it adds it, so offprompt is taken out and
      // added back to pick up new files.
      await attempt('codex', ['plugin', 'remove', PLUGIN])
      await attempt('codex', ['plugin', 'marketplace', 'remove', NAME])
      await run('codex', ['plugin', 'marketplace', 'add', plugin])
      await run('codex', ['plugin', 'add', PLUGIN])
      return `plugin ${PLUGIN} from ${plugin}`
    },
    remove: async () => {
      if (!(await onPath('codex'))) return undefined
      const removed = await attempt('codex', ['plugin', 'remove', PLUGIN])
      await attempt('codex', ['plugin', 'marketplace', 'remove', NAME])
      return removed ? `plugin ${PLUGIN} removed` : undefined
    },
  },
  project: {
    file: FILE,
    install: async (root, { command, args, timeoutMs }) => {
      const path = join(root, FILE)
      // Codex's default of 60 seconds would end the call while the human is still typing.
      const table = serverTable({ command, args, timeoutSec: timeoutMs / 1000, envVars: FORWARDED })
      await writeText(path, withServer((await readIfPresent(path)) ?? '', table))
      return `server in ${FILE}`
    },
    remove: async root => {
      const path = join(root, FILE)
      const text = await readIfPresent(path)
      if (text === undefined) return undefined
      const rest = withoutServer(text)
      if (rest === text.trimEnd()) return undefined
      await (rest === '' ? rm(path, { force: true }) : writeText(path, `${rest}\n`))
      return `server removed from ${FILE}`
    },
  },
}
