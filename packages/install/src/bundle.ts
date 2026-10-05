import { cp, mkdir, rm, rmdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'

import { exists } from './files.js'
import { serverFolder } from './origin.js'
import { BUNDLE } from './target.js'

/**
 * Puts the server into the project: the bundle, which needs nothing beside it but `node`,
 * and the notices its fonts, icons and logos ask to travel with it.
 */
export const vendorBundle = async (root: string) => {
  const server = await serverFolder()
  const built = join(server, 'dist/mcp.mjs')
  if (!(await exists(built))) throw new Error(`${built} is missing; build offprompt first`)
  await mkdir(dirname(join(root, BUNDLE)), { recursive: true })
  await cp(built, join(root, BUNDLE))
  await cp(join(server, 'THIRD_PARTY_NOTICES.md'), join(root, dirname(BUNDLE), 'THIRD_PARTY_NOTICES.md'))
  return dirname(BUNDLE)
}

/** Takes the server out of the project again. */
export const removeBundle = async (root: string) => {
  const folder = join(root, dirname(BUNDLE))
  const present = await exists(folder)
  await rm(folder, { recursive: true, force: true })
  // The folder that held it goes too, unless the project keeps something else there.
  await rmdir(dirname(folder)).catch(() => undefined)
  return present
}
