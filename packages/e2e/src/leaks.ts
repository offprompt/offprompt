import { cp, mkdir, readdir, readFile, rm, stat } from 'node:fs/promises'
import { basename, dirname, join, relative } from 'node:path'

/** Every file under a directory, with its path; nothing when there is no directory. */
export const filesUnder = async (dir: string) => {
  const entries = await readdir(dir, { recursive: true, withFileTypes: true }).catch(() => [])
  return entries.filter(entry => entry.isFile()).map(entry => join(entry.parentPath, entry.name))
}

const readText = (path: string) => readFile(path, 'utf8').catch(() => '')

/**
 * The agent's own record of the run: files under its sessions directory written since the
 * run started that mention the project. Found by what they hold rather than by name, since
 * every agent names them its own way.
 */
export const sessionFilesOf = async ({ dir, since, root }: { dir: string; since: number; root: string }) => {
  const files = await filesUnder(dir)
  const recent = await Promise.all(
    files.map(async path => ((await stat(path)).mtimeMs >= since && (await readText(path)).includes(root) ? [path] : [])),
  )
  return recent.flat()
}

/** Takes out a folder the session files left without any file, and its parents, up to `top`. */
export const prune = async (dir: string, top: string): Promise<void> => {
  const inside = relative(top, dir)
  if (inside === '' || inside.startsWith('..') || (await filesUnder(dir)).length > 0) return
  await rm(dir, { recursive: true, force: true })
  return prune(dirname(dir), top)
}

/**
 * Keeps a copy of the agent's session files with the run, and takes them out of the agent's
 * history under `top`, with any folder that leaves empty.
 */
export const collectSessions = async ({ files, artifacts, top }: { files: readonly string[]; artifacts: string; top: string }) => {
  const kept = join(artifacts, 'sessions')
  await mkdir(kept, { recursive: true })
  await Promise.all(files.map(path => cp(path, join(kept, basename(path)))))
  await Promise.all(files.map(path => rm(path, { force: true })))
  await Promise.all([...new Set(files.map(dirname))].map(dir => prune(dir, top)))
}

/** The project's files, `.env` and git's own aside: where the value must not have been copied. */
export const projectFiles = async (root: string) =>
  (await filesUnder(root)).filter(path => {
    const inside = relative(root, path)
    return inside !== '.env' && !inside.startsWith('.git/')
  })

/** Which of the places hold the value. */
export const leaksOf = async ({ value, places }: { value: string; places: readonly string[] }) => {
  const found = await Promise.all(places.map(async path => ((await readText(path)).includes(value) ? [path] : [])))
  return found.flat()
}
