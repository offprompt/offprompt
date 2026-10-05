import { ChildProcess } from 'node:child_process'
import { readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { PassThrough } from 'node:stream'
import { afterEach, expect, it, vi } from 'vitest'

import { announcedUrl, createTunnelManager } from '../src/mcp/tunnel.js'

const FAKE = resolve(import.meta.dirname, 'helpers/fake-cloudflared.mjs')

/**
 * The fake cloudflared is a Node script, which Windows starts only through node itself, and a
 * tunnel is only offered where cloudflared has a pinned release, which Windows has none of.
 */
const spawning = it.skipIf(process.platform === 'win32')

const teardowns: (() => Promise<void>)[] = []

const settleAfter = (ms: number) => new Promise<void>(done => setTimeout(done, ms))

const isAlive = (pid: number) => {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

const untilGone = async (pid: number): Promise<void> => {
  if (!isAlive(pid)) return
  await settleAfter(10)
  return untilGone(pid)
}

type Launch = { pid: number; args: string[] }

const setupTest = ({
  mode = 'announce',
  reaches = () => Promise.resolve(true),
  startTimeoutMs = 2_000,
  findBinary = () => Promise.resolve(FAKE),
}: {
  mode?: 'announce' | 'silent' | 'exit' | 'stubborn'
  reaches?: (url: string) => Promise<boolean>
  startTimeoutMs?: number
  findBinary?: () => Promise<string>
} = {}) => {
  const log = join(tmpdir(), `offprompt-fake-cloudflared-${String(process.pid)}-${String(Math.random()).slice(2)}.log`)
  vi.stubEnv('FAKE_CLOUDFLARED', mode)
  vi.stubEnv('FAKE_CLOUDFLARED_LOG', log)
  const hosts: (string | undefined)[] = []
  const tunnel = createTunnelManager({
    port: 54321,
    findBinary,
    onHost: host => void hosts.push(host),
    reaches,
    startTimeoutMs,
    killAfterMs: 150,
    pollEveryMs: 10,
  })
  const launches = async (): Promise<Launch[]> => {
    const text = await readFile(log, 'utf8').catch(() => '')
    return text
      .split('\n')
      .filter(line => line !== '')
      .map(line => JSON.parse(line) as Launch)
  }
  teardowns.push(async () => {
    await tunnel.close()
    await rm(log, { force: true })
  })
  return { tunnel, hosts, launches }
}

afterEach(async () => {
  await Promise.all(teardowns.splice(0).map(teardown => teardown()))
  vi.unstubAllEnvs()
})

spawning('reads the address from stderr and points the child at the loopback port, without a shell', async () => {
  const { tunnel, hosts, launches } = setupTest()

  const url = await tunnel.url()

  const [launch] = await launches()
  expect(url).toBe(`https://fake-${String(launch?.pid)}.trycloudflare.com`)
  expect(launch?.args).toEqual(['tunnel', '--no-autoupdate', '--url', 'http://127.0.0.1:54321'])
  expect(hosts).toEqual([`fake-${String(launch?.pid)}.trycloudflare.com`])
})

it('keeps none of the log once the address is out, and still reads it so the pipe never fills', async () => {
  const stderr = new PassThrough()
  const child = Object.assign(new ChildProcess(), { stderr })

  const url = announcedUrl(child)
  stderr.write('INF Requesting new quick Tunnel on trycloudflare.com...\n')
  stderr.write('INF |  https://some-words-here.trycloudflare.com  |\n')

  expect(await url).toBe('https://some-words-here.trycloudflare.com')
  expect(stderr.listenerCount('data')).toBe(0)
  expect(stderr.readableFlowing).toBe(true)
})

spawning('answers only once a GET through the tunnel reaches its own server', async () => {
  const answers = [false, false, true]
  const reaches = vi.fn(() => Promise.resolve(answers.shift() ?? true))
  const { tunnel } = setupTest({ reaches })

  expect(await tunnel.url()).toMatch(/trycloudflare\.com$/)
  expect(reaches).toHaveBeenCalledTimes(3)
})

spawning('reuses the one tunnel for every later request', async () => {
  const { tunnel, launches } = setupTest()

  const [first, second] = await Promise.all([tunnel.url(), tunnel.url()])
  const third = await tunnel.url()

  expect(second).toBe(first)
  expect(third).toBe(first)
  expect(await launches()).toHaveLength(1)
})

spawning('gives up when no address is announced in time, and kills the child', async () => {
  const { tunnel, hosts, launches } = setupTest({ mode: 'silent', startTimeoutMs: 150 })

  expect(await tunnel.url()).toBeUndefined()

  const [launch] = await launches()
  expect(launch).toBeDefined()
  await untilGone(launch?.pid ?? 0)
  expect(hosts.filter(host => host !== undefined)).toEqual([])
})

spawning('gives up when the address never reaches its own server, and forgets the host', async () => {
  // Long enough for the child, a Node process, to start and announce under a loaded machine; the
  // give-up is what is tested, and it comes at this limit.
  const { tunnel, hosts } = setupTest({ reaches: () => Promise.resolve(false), startTimeoutMs: 1_000 })

  expect(await tunnel.url()).toBeUndefined()
  expect(hosts.at(-1)).toBeUndefined()
  expect(hosts).toHaveLength(2)
})

it('gives up at once when there is no binary to run', async () => {
  const { tunnel, launches } = setupTest({ findBinary: () => Promise.reject(new Error('the download was blocked')) })

  expect(await tunnel.url()).toBeUndefined()
  expect(await launches()).toEqual([])
})

spawning('starts a new tunnel, with a new address, after the child exits', async () => {
  const { tunnel, hosts, launches } = setupTest({ mode: 'exit' })

  const first = await tunnel.url()
  const [firstLaunch] = await launches()
  await untilGone(firstLaunch?.pid ?? 0)
  await settleAfter(20)
  expect(hosts.at(-1)).toBeUndefined()

  const second = await tunnel.url()

  expect(first).toBeDefined()
  expect(second).toBeDefined()
  expect(second).not.toBe(first)
  expect(await launches()).toHaveLength(2)
})

spawning('kills the child on shutdown', async () => {
  const { tunnel, hosts, launches } = setupTest()
  await tunnel.url()
  const [launch] = await launches()

  await tunnel.close()

  expect(isAlive(launch?.pid ?? 0)).toBe(false)
  expect(hosts.at(-1)).toBeUndefined()
})

spawning('kills a child that ignores SIGTERM', async () => {
  const { tunnel, launches } = setupTest({ mode: 'stubborn' })
  await tunnel.url()
  const [launch] = await launches()

  await tunnel.close()

  expect(isAlive(launch?.pid ?? 0)).toBe(false)
})

spawning('writes nothing to stdout, which belongs to the protocol', async () => {
  const written = vi.spyOn(process.stdout, 'write')
  const { tunnel } = setupTest()

  await tunnel.url()
  await tunnel.close()

  expect(written).not.toHaveBeenCalled()
})
