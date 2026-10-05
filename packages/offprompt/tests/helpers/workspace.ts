import { execFile } from 'node:child_process'
import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { promisify } from 'node:util'

const run = promisify(execFile)

/**
 * The mode a secret file reads back with: 0600, its owner's alone, where files carry a mode.
 * Windows has none, and Node reports a writable file there as 0666; the file takes the
 * permissions of its folder instead.
 */
export const WRITTEN_MODE = process.platform === 'win32' ? 0o666 : 0o600

/** A throwaway project directory, optionally a git repository. */
export const setupWorkspace = async ({ git = false }: { git?: boolean } = {}) => {
  const root = await mkdtemp(join(tmpdir(), 'offprompt-test-'))

  const write = async (relative: string, contents: string) => {
    await writeFile(join(root, relative), contents, 'utf8')
    return join(root, relative)
  }

  const read = (relative: string) => readFile(join(root, relative), 'utf8')

  const modeOf = async (relative: string) => {
    const stats = await stat(join(root, relative))
    return stats.mode & 0o777
  }

  const exists = (relative: string) =>
    stat(join(root, relative))
      .then(() => true)
      .catch(() => false)

  const gitInit = async () => {
    await run('git', ['init', '--quiet'], { cwd: root })
    await run('git', ['config', 'user.email', 'test@example.com'], { cwd: root })
    await run('git', ['config', 'user.name', 'Test'], { cwd: root })
  }

  const track = async (relative: string) => {
    await run('git', ['add', '--', relative], { cwd: root })
    await run('git', ['commit', '--quiet', '-m', 'add'], { cwd: root })
  }

  if (git) await gitInit()

  return {
    root,
    write,
    read,
    modeOf,
    exists,
    track,
    dirOf: (relative: string) => dirname(join(root, relative)),
    cleanup: () => rm(root, { recursive: true, force: true }),
  }
}
