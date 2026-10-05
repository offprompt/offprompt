import { execFile } from 'node:child_process'
import { createHash } from 'node:crypto'
import { access, chmod, constants, mkdir, rename, rm, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { delimiter, isAbsolute, join } from 'node:path'
import { promisify } from 'node:util'

const run = promisify(execFile)

const BINARY = 'cloudflared'

export const CLOUDFLARED_VERSION = '2026.9.1'

const DOWNLOAD_TIMEOUT_MS = 60_000

/** A release asset for one platform, pinned by the SHA-256 of the file as downloaded. */
export type Release = { readonly asset: string; readonly sha256: string; readonly archive: boolean }

const RELEASES: Readonly<Record<string, Release>> = {
  'linux-x64': {
    asset: 'cloudflared-linux-amd64',
    sha256: '03f1f25d1cc93b9ad6c60569d44060bc4f17ed97075760ed8cfca4b12dcd68cc',
    archive: false,
  },
  'linux-arm64': {
    asset: 'cloudflared-linux-arm64',
    sha256: '3d97437c71848bd8df68041e12436b484a661d95073ea1937f01a845ce88faa3',
    archive: false,
  },
  'darwin-x64': {
    asset: 'cloudflared-darwin-amd64.tgz',
    sha256: 'ff0d3b51d5ff70eceef89d6b32145fee985018a2174596a5dbe405e2766e2ac4',
    archive: true,
  },
  'darwin-arm64': {
    asset: 'cloudflared-darwin-arm64.tgz',
    sha256: 'c27ab8fd0aa489449e3d201eb02f957ef460a13b613662928b1b23394bf1bcfe',
    archive: true,
  },
}

export const releaseFor = ({ platform, arch }: { platform: string; arch: string }) => RELEASES[`${platform}-${arch}`]

const urlOf = (release: Release) =>
  `https://github.com/cloudflare/cloudflared/releases/download/${CLOUDFLARED_VERSION}/${release.asset}`

const isExecutable = (path: string) =>
  access(path, constants.X_OK).then(
    () => true,
    () => false,
  )

/** The first `cloudflared` on `PATH`, looked up without a shell. */
export const onPath = async (path = process.env.PATH ?? '') => {
  const candidates = path
    .split(delimiter)
    .filter(directory => directory !== '')
    .map(directory => join(directory, BINARY))
  const found = await Promise.all(candidates.map(isExecutable))
  return candidates.find((_, index) => found[index])
}

/**
 * Where a downloaded binary is kept: the plugin's data directory, which Agent Plugins
 * clients set as `PLUGIN_DATA` and Claude Code as `CLAUDE_PLUGIN_DATA`, or the user's cache.
 */
export const cacheDirectory = (env: Readonly<Record<string, string | undefined>> = process.env) => {
  const pluginData = [env.PLUGIN_DATA, env.CLAUDE_PLUGIN_DATA].find(
    // A host that does not expand the variable passes the placeholder through as it is.
    directory => directory !== undefined && isAbsolute(directory),
  )
  return pluginData ?? join(env.XDG_CACHE_HOME ?? join(homedir(), '.cache'), 'offprompt')
}

const fetchAsset = async (url: string) => {
  const response = await fetch(url, { signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS) })
  if (!response.ok) throw new Error(`the download answered ${String(response.status)}`)
  return Buffer.from(await response.arrayBuffer())
}

const sha256Of = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex')

/** Puts the binary in `directory`, from the bare file or from the archive that holds it. */
const unpack = async ({ bytes, release, directory }: { bytes: Buffer; release: Release; directory: string }) => {
  if (!release.archive) {
    await writeFile(join(directory, BINARY), bytes, { mode: 0o755 })
    return
  }
  const archive = join(directory, release.asset)
  await writeFile(archive, bytes)
  await run('tar', ['-xzf', archive, '-C', directory, BINARY])
  await rm(archive)
  await chmod(join(directory, BINARY), 0o755)
}

/**
 * Downloads the pinned release and keeps it only when its SHA-256 is the pinned one. It is
 * unpacked beside its final place and renamed in, so a half-written binary is never run.
 */
export const download = async ({
  release,
  directory,
  fetchBytes = fetchAsset,
}: {
  release: Release
  directory: string
  fetchBytes?: (url: string) => Promise<Buffer>
}) => {
  const bytes = await fetchBytes(urlOf(release))
  if (sha256Of(bytes) !== release.sha256) throw new Error(`${release.asset} does not match its pinned SHA-256`)
  const staging = `${directory}.partial`
  await rm(staging, { recursive: true, force: true })
  await mkdir(staging, { recursive: true })
  await unpack({ bytes, release, directory: staging })
  await rm(directory, { recursive: true, force: true })
  await rename(staging, directory)
  return join(directory, BINARY)
}

/**
 * The `cloudflared` to run: the one on `PATH`, else the cached download, else a fresh
 * download. Rejects when this platform has no pinned release or the download fails.
 */
export const findCloudflared = async ({
  env = process.env,
  platform = process.platform,
  arch = process.arch,
}: {
  env?: Readonly<Record<string, string | undefined>>
  platform?: string
  arch?: string
} = {}) => {
  const installed = await onPath(env.PATH ?? '')
  if (installed !== undefined) return installed
  const release = releaseFor({ platform, arch })
  if (release === undefined) throw new Error(`no cloudflared release is pinned for ${platform}-${arch}`)
  const directory = join(cacheDirectory(env), `${BINARY}-${CLOUDFLARED_VERSION}`)
  const cached = join(directory, BINARY)
  if (await isExecutable(cached)) return cached
  return download({ release, directory })
}
