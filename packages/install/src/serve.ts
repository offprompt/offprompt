import { spawn } from 'node:child_process'
import { constants } from 'node:os'
import { join } from 'node:path'

import { exists } from './files.js'
import { serverFolder } from './origin.js'

/** Signals that stop the CLI, which the server is sent too, so it closes its page before it goes. */
const PASSED_ON = ['SIGINT', 'SIGTERM', 'SIGHUP'] as const

/**
 * Runs the server on stdio in the directory the command runs in, for a client that starts it
 * as `npx -y offprompt mcp`. The server reads and writes the client's own streams, so nothing
 * of this CLI comes between them. Resolves with the code the server exits with, or, when a
 * signal ended it, 128 and the signal's number, as a shell reports it.
 */
export const serve = async () => {
  const server = join(await serverFolder(), 'dist/mcp.mjs')
  if (!(await exists(server))) throw new Error(`${server} is missing; build offprompt first`)
  const child = spawn(process.execPath, [server], { stdio: 'inherit' })
  PASSED_ON.forEach(signal => process.on(signal, () => child.kill(signal)))
  return new Promise<number>((resolve, reject) => {
    child.once('error', reject)
    child.once('exit', (code, signal) => resolve(code ?? (signal === null ? 1 : 128 + constants.signals[signal])))
  })
}
