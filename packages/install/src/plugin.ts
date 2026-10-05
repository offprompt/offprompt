import { chmod, cp, mkdir, mkdtemp, readdir, realpath, rename, rm } from 'node:fs/promises'
import { homedir } from 'node:os'
import { basename, dirname, join } from 'node:path'

import { exists, isMissing, startServerWith } from './files.js'
import { ROOT } from './origin.js'
import { EARLIER_LAUNCHER, LAUNCHER, PLUGIN_BUNDLE } from './target.js'

/**
 * Where -g keeps the plugin every agent installs from. npx runs the CLI from a cache it may
 * clear, so the package is copied here first.
 */
export const settled = () => join(homedir(), '.local/share/offprompt')

/** Whether a folder holds a plugin offprompt made, by the launcher it carries now or carried before. */
const holdsPlugin = async (path: string) => (await exists(join(path, LAUNCHER))) || exists(join(path, EARLIER_LAUNCHER))

/** A folder offprompt may replace: absent, empty, or a plugin it made. */
const replaceable = async (path: string) => {
  const entries = await readdir(path).catch((error: unknown) => {
    if (isMissing(error)) return []
    throw error
  })
  return entries.length === 0 || holdsPlugin(path)
}

/** Whether two paths name one folder, links followed. */
const sameFolder = async (one: string, other: string) => {
  const [first, second] = await Promise.all([one, other].map(path => realpath(path).catch(() => path)))
  return first === second
}

/** The codes Windows gives a rename while another program, such as a virus scanner, holds a file in the folder. */
const HELD = new Set(['EPERM', 'EACCES', 'EBUSY'])

const isHeld = (error: unknown) =>
  error !== null && typeof error === 'object' && 'code' in error && typeof error.code === 'string' && HELD.has(error.code)

const sleep = (ms: number) => new Promise<void>(done => setTimeout(done, ms))

/**
 * Renames a folder, trying again for a few seconds while Windows says a file in it is held:
 * a scanner opens the files a copy has just written, and lets go of them soon after.
 */
const renameFolder = (from: string, to: string, attempts = 20): Promise<void> =>
  rename(from, to).catch(async (error: unknown) => {
    if (process.platform !== 'win32' || attempts <= 1 || !isHeld(error)) throw error
    await sleep(250)
    return renameFolder(from, to, attempts - 1)
  })

/** Moves a folder aside, and says whether there was one to move. */
const moveAside = (from: string, to: string) =>
  renameFolder(from, to).then(
    () => true,
    (error: unknown) => {
      if (isMissing(error)) return false
      throw error
    },
  )

/**
 * Has a plugin's manifests start the bundle with node rather than the launcher. Windows runs
 * no sh script by itself: Codex refuses the launcher outright, and Claude Code and Pi run it
 * through an `sh` that a default Git for Windows install keeps off the PATH. The launcher
 * would start the bundle with node on Windows anyway. Each manifest names the bundle the way
 * its agent resolves a path in the plugin.
 */
export const startWithNode = (plugin: string) =>
  Promise.all([
    startServerWith(join(plugin, '.mcp.json'), { command: 'node', args: [`\${CLAUDE_PLUGIN_ROOT}/${PLUGIN_BUNDLE}`] }),
    startServerWith(join(plugin, 'mcp.json'), { command: 'node', args: [`\${PLUGIN_ROOT}/${PLUGIN_BUNDLE}`] }),
    // Codex starts its plugin in the plugin's folder, from `cwd: "."`.
    startServerWith(join(plugin, '.codex-plugin/plugin.json'), { command: 'node', args: [`./${PLUGIN_BUNDLE}`] }),
  ])

/**
 * Copies the package the CLI runs from, which is the plugin, to `target`, and says so. The
 * copy is made beside the target and renamed into place whole, so an agent never finds half a
 * plugin there, and the plugin it replaces comes back if that fails. A folder offprompt did
 * not make is left as it is. Nothing is copied when the CLI already runs from the target. On
 * Windows the copy's manifests start the bundle with node.
 */
export const settlePlugin = async (target: string, platform: string = process.platform) => {
  if (await sameFolder(ROOT, target)) return undefined
  if (!(await replaceable(target))) {
    throw new Error(`${target} holds other files, and offprompt only replaces a plugin it put there`)
  }
  await mkdir(dirname(target), { recursive: true })
  const staging = await mkdtemp(join(dirname(target), `.${basename(target)}-`))
  const previous = `${staging}-previous`
  try {
    await cp(ROOT, staging, { recursive: true, filter: source => basename(source) !== 'node_modules' })
    // An archive unpacked on Windows can lose the launcher's mode, which the agents run it by.
    await chmod(join(staging, LAUNCHER), 0o755)
    if (platform === 'win32') await startWithNode(staging)
    const replacing = await moveAside(target, previous)
    await renameFolder(staging, target).catch(async (error: unknown) => {
      if (replacing) await renameFolder(previous, target)
      throw error
    })
    await rm(previous, { recursive: true, force: true })
    return `plugin in ${target}`
  } finally {
    await rm(staging, { recursive: true, force: true })
  }
}

/** Takes away the plugin -g settled, when it is one offprompt made, and says whether it was there. */
export const removeSettled = async (target: string) => {
  if (!(await holdsPlugin(target))) return false
  await rm(target, { recursive: true, force: true })
  return true
}
