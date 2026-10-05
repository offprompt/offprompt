import { spawn, type ChildProcess } from 'node:child_process'

import { note } from '../core/log.js'
import { createReachability } from './reach.js'

const START_TIMEOUT_MS = 20_000

const KILL_AFTER_MS = 2_000

const POLL_EVERY_MS = 500

const TUNNEL_URL = /https:\/\/[a-z0-9-]+\.trycloudflare\.com/

const delay = (ms: number) =>
  new Promise<void>(resolve => {
    setTimeout(resolve, ms).unref()
  })

/**
 * The first quick-tunnel address the child prints. It resolves to nothing if the child ends
 * first. Once the address is known, the rest of the log is read and dropped rather than kept
 * for the life of the tunnel.
 */
export const announcedUrl = (child: ChildProcess) =>
  new Promise<string | undefined>(resolve => {
    const stderr = child.stderr?.setEncoding('utf8')
    const seen: string[] = []
    const read = (chunk: string) => {
      seen.push(chunk)
      const found = TUNNEL_URL.exec(seen.join(''))?.[0]
      if (found === undefined) return
      stderr?.off('data', read)
      stderr?.resume()
      resolve(found)
    }
    stderr?.on('data', read)
    // Read so the pipe never fills, and never passed on: this process's stdout is the protocol channel.
    child.stdout?.resume()
    child.once('error', () => resolve(undefined))
    child.once('exit', () => resolve(undefined))
  })

const hasExited = (child: ChildProcess) => child.exitCode !== null || child.signalCode !== null

/** SIGTERM, then SIGKILL for a child that is still there two seconds later. */
const stop = async ({ child, killAfterMs }: { child: ChildProcess; killAfterMs: number }) => {
  if (hasExited(child) || child.pid === undefined) return
  const exited = new Promise<void>(resolve => {
    child.once('exit', () => resolve())
  })
  child.kill('SIGTERM')
  const outcome = await Promise.race([
    exited.then(() => 'exited' as const),
    delay(killAfterMs).then(() => 'still-up' as const),
  ])
  if (outcome === 'exited') return
  child.kill('SIGKILL')
  await exited
}

type Running = { readonly child: ChildProcess; readonly url: Promise<string | undefined> }

/**
 * One quick tunnel to the loopback server for the life of this process, started on the
 * first remote request. When its child exits, the next request starts another, with a new
 * address.
 */
export const createTunnelManager = ({
  port,
  findBinary,
  onHost,
  reaches = createReachability(),
  startTimeoutMs = START_TIMEOUT_MS,
  killAfterMs = KILL_AFTER_MS,
  pollEveryMs = POLL_EVERY_MS,
}: {
  port: number
  findBinary: () => Promise<string>
  /** Told the tunnel's hostname as soon as it is known, and `undefined` once the tunnel is gone. */
  onHost: (host: string | undefined) => void
  reaches?: (url: string) => Promise<boolean>
  startTimeoutMs?: number
  killAfterMs?: number
  pollEveryMs?: number
}) => {
  const state: { running: Running | undefined; starting: Promise<string | undefined> | undefined } = {
    running: undefined,
    starting: undefined,
  }

  /** Cloudflare's address can take a moment to answer. Polling ends with the child. */
  const untilReachable = async ({ url, child }: { url: string; child: ChildProcess }): Promise<string | undefined> => {
    if (hasExited(child)) return undefined
    if (await reaches(url)) return url
    await delay(pollEveryMs)
    return untilReachable({ url, child })
  }

  /** The address once a request through it arrives here. */
  const comeUp = async (child: ChildProcess) => {
    const url = await announcedUrl(child)
    if (url === undefined) return undefined
    onHost(new URL(url).host)
    return untilReachable({ url, child })
  }

  const forget = (child: ChildProcess) => {
    if (state.running?.child !== child) return
    state.running = undefined
    onHost(undefined)
  }

  const launch = (binary: string): Running => {
    const child = spawn(binary, ['tunnel', '--no-autoupdate', '--url', `http://127.0.0.1:${String(port)}`], {
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    child.once('error', () => forget(child))
    child.once('exit', () => forget(child))
    const url = Promise.race([comeUp(child), delay(startTimeoutMs).then(() => undefined)]).then(async found => {
      if (found !== undefined && !hasExited(child)) return found
      forget(child)
      await stop({ child, killAfterMs })
      return undefined
    })
    return { child, url }
  }

  const start = async () => {
    const binary = await findBinary().catch((error: unknown) => {
      note(`no cloudflared to run: ${error instanceof Error ? error.message : String(error)}`)
      return undefined
    })
    if (binary === undefined) return undefined
    // A request that arrived while the binary was being found may have started the tunnel already.
    state.running ??= launch(binary)
    return state.running.url
  }

  return {
    /** The tunnel's public address, or nothing when no tunnel could be brought up. */
    url: () => {
      if (state.running !== undefined) return state.running.url
      state.starting ??= start().finally(() => {
        state.starting = undefined
      })
      return state.starting
    },
    close: async () => {
      const running = state.running
      if (running === undefined) return
      forget(running.child)
      await stop({ child: running.child, killAfterMs })
    },
  }
}

export type TunnelManager = ReturnType<typeof createTunnelManager>
