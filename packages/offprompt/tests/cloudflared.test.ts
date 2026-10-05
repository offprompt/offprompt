import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { chmod, mkdir, mkdtemp, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { delimiter, join } from 'node:path'
import { afterEach, expect, it, vi } from 'vitest'

import { cacheDirectory, download, onPath, releaseFor, type Release } from '../src/mcp/cloudflared.js'

const teardowns: (() => Promise<void>)[] = []

/**
 * Windows marks no file executable, and a tunnel is only offered where cloudflared has a pinned
 * release, which Windows has none of; what rests on the executable mark is tested elsewhere.
 */
const WINDOWS = process.platform === 'win32'

const BINARY = Buffer.from('#!/bin/sh\necho cloudflared\n', 'utf8')

const sha256Of = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex')

const setupTest = async () => {
  const root = await mkdtemp(join(tmpdir(), 'offprompt-cloudflared-'))
  teardowns.push(() => rm(root, { recursive: true, force: true }))
  const directory = join(root, 'cloudflared-test')
  const exists = (path: string) =>
    stat(path).then(
      () => true,
      () => false,
    )
  return { root, directory, exists }
}

afterEach(async () => {
  await Promise.all(teardowns.splice(0).map(teardown => teardown()))
})

it('keeps a download whose SHA-256 is the pinned one', async () => {
  const { directory } = await setupTest()
  const release: Release = { asset: 'cloudflared-linux-amd64', sha256: sha256Of(BINARY), archive: false }
  const fetchBytes = vi.fn(() => Promise.resolve(BINARY))

  const path = await download({ release, directory, fetchBytes })

  expect(path).toBe(join(directory, 'cloudflared'))
  expect(await readFile(path)).toEqual(BINARY)
  expect(fetchBytes).toHaveBeenCalledWith(expect.stringMatching(/^https:\/\/github\.com\/cloudflare\/cloudflared\/releases\/download\//))
})

it.skipIf(WINDOWS)('marks the download executable', async () => {
  const { directory } = await setupTest()
  const release: Release = { asset: 'cloudflared-linux-amd64', sha256: sha256Of(BINARY), archive: false }

  const path = await download({ release, directory, fetchBytes: () => Promise.resolve(BINARY) })

  expect((await stat(path)).mode & 0o111).not.toBe(0)
})

it.skipIf(WINDOWS)("unpacks a release that comes as an archive, as macOS's does, and keeps the binary alone", async () => {
  const { root, directory } = await setupTest()
  const staging = join(root, 'staging')
  await mkdir(staging)
  await writeFile(join(staging, 'cloudflared'), BINARY)
  const archive = join(root, 'cloudflared.tgz')
  execFileSync('tar', ['-czf', archive, '-C', staging, 'cloudflared'])
  const bytes = await readFile(archive)
  const release: Release = { asset: 'cloudflared-darwin-arm64.tgz', sha256: sha256Of(bytes), archive: true }

  const path = await download({ release, directory, fetchBytes: () => Promise.resolve(bytes) })

  expect(await readFile(path)).toEqual(BINARY)
  expect((await stat(path)).mode & 0o111).not.toBe(0)
  expect(await readdir(directory)).toEqual(['cloudflared'])
})

it('refuses a download whose SHA-256 differs from the pinned one, and keeps nothing', async () => {
  const { directory, exists } = await setupTest()
  const release: Release = { asset: 'cloudflared-linux-amd64', sha256: sha256Of(BINARY), archive: false }
  const tampered = Buffer.concat([BINARY, Buffer.from('x')])

  await expect(download({ release, directory, fetchBytes: () => Promise.resolve(tampered) })).rejects.toThrow(
    'does not match its pinned SHA-256',
  )
  expect(await exists(directory)).toBe(false)
  expect(await exists(`${directory}.partial`)).toBe(false)
})

it('pins a release for the platforms sandboxes and laptops run, and none for the rest', () => {
  expect(releaseFor({ platform: 'linux', arch: 'x64' })?.asset).toBe('cloudflared-linux-amd64')
  expect(releaseFor({ platform: 'linux', arch: 'arm64' })?.asset).toBe('cloudflared-linux-arm64')
  expect(releaseFor({ platform: 'darwin', arch: 'arm64' })?.archive).toBe(true)
  expect(releaseFor({ platform: 'win32', arch: 'x64' })).toBeUndefined()
})

it.skipIf(WINDOWS)('finds an executable cloudflared on PATH and passes over one that cannot run', async () => {
  const { root } = await setupTest()
  const [plain, runs] = await Promise.all([mkdtemp(join(root, 'plain-')), mkdtemp(join(root, 'runs-'))])
  await writeFile(join(plain, 'cloudflared'), BINARY, { mode: 0o644 })
  await writeFile(join(runs, 'cloudflared'), BINARY)
  await chmod(join(runs, 'cloudflared'), 0o755)

  expect(await onPath([plain, runs].join(delimiter))).toBe(join(runs, 'cloudflared'))
  expect(await onPath(plain)).toBeUndefined()
  expect(await onPath('')).toBeUndefined()
})

it('caches in the plugin data directory, and in the user cache when the host gives none', () => {
  expect(cacheDirectory({ CLAUDE_PLUGIN_DATA: '/data/offprompt' })).toBe('/data/offprompt')
  expect(cacheDirectory({ PLUGIN_DATA: '/agent-plugins/data' })).toBe('/agent-plugins/data')
  expect(cacheDirectory({ CLAUDE_PLUGIN_DATA: '${CLAUDE_PLUGIN_DATA}', XDG_CACHE_HOME: '/cache' })).toBe(
    join('/cache', 'offprompt'),
  )
  expect(cacheDirectory({ XDG_CACHE_HOME: '/cache' })).toBe(join('/cache', 'offprompt'))
})
