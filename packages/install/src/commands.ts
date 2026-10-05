import spawn from 'cross-spawn'
import { access, constants } from 'node:fs/promises'
import { delimiter, join } from 'node:path'

/** The extensions Windows tries when a command is named without one, as its own shell does. */
const DEFAULT_PATHEXT = '.COM;.EXE;.BAT;.CMD'

/**
 * The file names a command can have: on Windows the bare name and the name with each extension
 * in PATHEXT, since npm installs a CLI there as `claude.cmd` and an installer as `claude.exe`.
 * Windows matches names in any case; the extensions are lowered as npm and installers write them.
 */
const namesOf = ({ command, platform, pathext }: { command: string; platform: string; pathext: string }) =>
  platform === 'win32'
    ? [
        command,
        ...pathext
          .split(';')
          .filter(extension => extension !== '')
          .map(extension => `${command}${extension.toLowerCase()}`),
      ]
    : [command]

/** Whether an agent's CLI is on `PATH`, looked up without a shell. */
export const onPath = async (
  command: string,
  path = process.env.PATH ?? '',
  { platform = process.platform, pathext = process.env.PATHEXT ?? DEFAULT_PATHEXT } = {},
) => {
  const names = namesOf({ command, platform, pathext })
  const candidates = path
    .split(delimiter)
    .filter(directory => directory !== '')
    .flatMap(directory => names.map(name => join(directory, name)))
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
 * Runs a CLI and resolves once it exits, or rejects with what it printed to stderr. cross-spawn
 * finds the command as a shell would and starts a Windows `.cmd` through cmd.exe with its
 * arguments quoted, which Node will not do on its own.
 */
const execute = (command: string, args: readonly string[]) =>
  new Promise<void>((resolve, reject) => {
    const child = spawn(command, [...args], { stdio: ['ignore', 'ignore', 'pipe'] })
    const printed: string[] = []
    child.stderr?.setEncoding('utf8').on('data', (chunk: string) => printed.push(chunk))
    child.once('error', reject)
    child.once('close', code => {
      const stderr = printed.join('').trim()
      if (code === 0) resolve()
      else reject(new Error(stderr === '' ? `exited with ${String(code)}` : stderr))
    })
  })

/** Runs an agent's CLI and fails with what it printed when it fails. */
export const run = async (command: string, args: readonly string[]) => {
  await execute(command, args).catch((error: unknown) => {
    throw new Error(`${command} ${args.join(' ')}: ${error instanceof Error ? error.message : String(error)}`)
  })
}

/** Runs a step whose failure is expected when there is nothing to undo, such as removing what is absent. */
export const attempt = (command: string, args: readonly string[]) =>
  execute(command, args).then(
    () => true,
    () => false,
  )
