import { createRequire } from 'node:module'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { exists } from './files.js'
import { LAUNCHER } from './target.js'

/**
 * The folder the CLI runs from, one above its own `dist/`: the npm package, which is the
 * plugin itself, or packages/install in this repository.
 */
export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/** Whether the CLI runs from the package `pnpm package` assembles, rather than from this repository. */
export const packaged = () => exists(join(ROOT, LAUNCHER))

/**
 * The folder holding the server, `dist/mcp.mjs`, and the notices that travel with it: the
 * package the CLI runs from, or in this repository the offprompt package, once built.
 */
export const serverFolder = async () =>
  (await packaged()) ? ROOT : dirname(createRequire(import.meta.url).resolve('offprompt/package.json'))

/** This checkout, which is nobody's project, or nothing when the CLI runs from its package. */
export const repository = async () => ((await packaged()) ? undefined : resolve(ROOT, '../..'))
