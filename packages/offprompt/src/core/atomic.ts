import { randomBytes } from 'node:crypto'
import { rename, unlink, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

const SECRET_FILE_MODE = 0o600

/**
 * Writes `contents` to `path` through a temp file in the same directory, so a reader
 * never observes a half-written secret and the final file is never world-readable.
 */
export const writeFileAtomic = async (path: string, contents: string): Promise<void> => {
  const temp = join(dirname(path), `.offprompt-${randomBytes(8).toString('hex')}.tmp`)
  try {
    await writeFile(temp, contents, { mode: SECRET_FILE_MODE, encoding: 'utf8' })
    await rename(temp, path)
  } catch (error) {
    await unlink(temp).catch(() => undefined)
    throw error
  }
}
