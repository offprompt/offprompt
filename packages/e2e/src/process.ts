import spawn from 'cross-spawn'
import { access, constants, readFile } from 'node:fs/promises'
import { delimiter, join } from 'node:path'
import type { Readable } from 'node:stream'
import { text } from 'node:stream/consumers'

/** All a stream carried, or nothing for one that was never opened. */
const all = (stream: Readable | null) => (stream === null ? Promise.resolve('') : text(stream))

/** The names a command has: on Windows also with each extension it tries, as npm installs `claude.cmd`. */
const namesOf = (command: string) =>
  process.platform === 'win32'
    ? [command, ...(process.env.PATHEXT ?? '.EXE;.CMD').split(';').filter(Boolean).map(extension => `${command}${extension.toLowerCase()}`)]
    : [command]

/** Whether a command is on `PATH`, looked up without a shell. */
export const onPath = async (command: string) => {
  const candidates = (process.env.PATH ?? '')
    .split(delimiter)
    .filter(directory => directory !== '')
    .flatMap(directory => namesOf(command).map(name => join(directory, name)))
  const found = await Promise.all(
    candidates.map(candidate =>
      access(candidate, constants.X_OK).then(
        () => true,
        () => false,
      ),
    ),
  )
  return found.includes(true)
}

export type Output = {
  readonly code: number | null
  readonly stdout: string
  readonly stderr: string
  readonly timedOut: boolean
}

/**
 * Runs an agent, or npm, to the end, with nothing on stdin, and gives up on it after a while.
 * cross-spawn starts a Windows `.cmd`, as npm installs claude, codex, npm and npx there.
 */
export const runCommand = async ({
  command,
  args,
  env = {},
  cwd,
  timeoutMs,
}: {
  command: string
  args: readonly string[]
  env?: Readonly<Record<string, string>>
  cwd: string
  timeoutMs: number
}): Promise<Output> => {
  const child = spawn(command, [...args], { cwd, env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'pipe'] })
  const timer = setTimeout(() => child.kill('SIGTERM'), timeoutMs)
  const exited = new Promise<number | null>(resolve => {
    child.once('error', () => resolve(null))
    child.once('close', code => resolve(code))
  })
  const [stdout, stderr, code] = await Promise.all([all(child.stdout), all(child.stderr), exited])
  clearTimeout(timer)
  return { code, stdout, stderr, timedOut: child.signalCode === 'SIGTERM' }
}

export const delay = (ms: number) =>
  new Promise<void>(resolve => {
    setTimeout(resolve, ms).unref()
  })

export const readIfPresent = (path: string) => readFile(path, 'utf8').catch(() => '')
