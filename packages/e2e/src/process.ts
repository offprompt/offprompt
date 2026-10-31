import spawn from 'cross-spawn'
import type { ChildProcess } from 'node:child_process'
import { access, constants, readFile } from 'node:fs/promises'
import { delimiter, join } from 'node:path'
import type { Readable } from 'node:stream'
import { text } from 'node:stream/consumers'

/** All a stream carried, or nothing for one that was never opened. */
const all = (stream: Readable | null) => (stream === null ? Promise.resolve('') : text(stream))

export const delay = (ms: number) =>
  new Promise<void>(resolve => {
    setTimeout(resolve, ms).unref()
  })

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

/**
 * Stops a process and everything it started. On Windows killing a process leaves its children
 * running, and an agent npm installed as a `.cmd` runs under cmd.exe, so the whole tree goes
 * through taskkill.
 */
const stopTree = (pid: number) => {
  if (process.platform === 'win32') {
    spawn.sync('taskkill', ['/pid', String(pid), '/t', '/f'], { stdio: 'ignore' })
    return
  }
  try {
    process.kill(pid, 'SIGTERM')
  } catch {
    // Gone already.
  }
}

/** Whether a process is still running: signal 0 only asks. EPERM means it runs as someone else. */
const isRunning = (pid: number) => {
  try {
    process.kill(pid, 0)
    return true
  } catch (error: unknown) {
    return error instanceof Error && 'code' in error && error.code === 'EPERM'
  }
}

/** Polls until none of `pids` runs, or `ms` is up; says which still do. */
const exitedWithin = async (pids: readonly number[], ms: number): Promise<readonly number[]> => {
  const running = pids.filter(isRunning)
  if (running.length === 0 || ms <= 0) return running
  await delay(100)
  return exitedWithin(running, ms - 100)
}

/**
 * Waits for processes a run started to exit, and stops any still running after `graceMs`. An
 * offprompt server exits on its own once the agent closes its stdin, a moment after the agent
 * itself, and on Windows a folder cannot be removed while a process still runs in it.
 */
export const settle = async (pids: readonly number[], graceMs = 10_000) => {
  const lingering = await exitedWithin(pids, graceMs)
  lingering.forEach(stopTree)
  await exitedWithin(lingering, 5_000)
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
  const child: ChildProcess = spawn(command, [...args], { cwd, env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'pipe'] })
  let timedOut = false
  const timer = setTimeout(() => {
    timedOut = true
    if (child.pid !== undefined) stopTree(child.pid)
  }, timeoutMs)
  const exited = new Promise<number | null>(resolve => {
    child.once('error', () => resolve(null))
    child.once('close', code => resolve(code))
  })
  const [stdout, stderr, code] = await Promise.all([all(child.stdout), all(child.stderr), exited])
  clearTimeout(timer)
  return { code, stdout, stderr, timedOut }
}

export const readIfPresent = (path: string) => readFile(path, 'utf8').catch(() => '')
