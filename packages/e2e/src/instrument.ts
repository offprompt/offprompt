import { readFile, rename, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const isObject = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isList = (value: unknown): value is readonly unknown[] => Array.isArray(value)

/** What the launcher needs to know: where it records, the hook it loads, and whether the tunnel may come up. */
type Recording = {
  /** Every MCP message in both directions. */
  readonly traffic: string
  /** The addresses offprompt handed the platform's opener. */
  readonly opened: string
  /** The hook that catches the opener, as the file URL `--import` takes. */
  readonly hook: string
  /** Whether offprompt may expose a sandbox's page through a Cloudflare quick tunnel. */
  readonly tunnel: boolean
}

/** Where a run records, in its artifacts folder. */
const recordingIn = ({ artifacts, tunnel }: { artifacts: string; tunnel: boolean }): Recording => ({
  traffic: join(artifacts, 'traffic.jsonl'),
  opened: join(artifacts, 'opened.txt'),
  hook: pathToFileURL(join(artifacts, 'opener.mjs')).href,
  tunnel,
})

/** The file a run writes into the agent's home, which the launcher in a plugin reads its recording from. */
const RECORDING_FILE = 'offprompt-e2e.json'

/**
 * The launcher an agent starts in place of the bundle, with `places` defining where it records.
 * It runs the real bundle with the page opener caught by a hook, so every page is one the run
 * can reach, and with the tunnel off unless the run asks for it. It records every MCP message
 * in both directions, with which directory it was started in and where it was started from. Of
 * the environment it records the names only. Each record carries the launcher's process id, so
 * two clients that started it apart can be told apart.
 */
const shim = (places: string) => `import { spawn } from 'node:child_process'
import { appendFileSync, existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = fileURLToPath(import.meta.url)
${places}
const record = entry => appendFileSync(traffic, JSON.stringify({ at: Date.now(), pid: process.pid, ...entry }) + '\\n')
record({ direction: 'start', cwd: process.cwd(), server: here, env: Object.keys(process.env).sort() })

const real = fileURLToPath(new URL('./mcp.real.mjs', import.meta.url))
const child = spawn(process.execPath, ['--import', hook, real, ...process.argv.slice(2)], {
  stdio: ['pipe', 'pipe', 'pipe'],
  // A run offprompt takes for a sandbox gets a sealed page on the loopback, unless the run
  // asks for the tunnel, which then exposes the page through Cloudflare as it would anywhere.
  env: { ...process.env, OFFPROMPT_E2E_OPENED: opened, ...(tunnel ? {} : { OFFPROMPT_TUNNEL: 'off' }) },
})
process.stdin.on('data', chunk => {
  record({ direction: 'in', data: chunk.toString('utf8') })
  child.stdin.write(chunk)
})
process.stdin.on('end', () => child.stdin.end())
child.stdout.on('data', chunk => {
  record({ direction: 'out', data: chunk.toString('utf8') })
  process.stdout.write(chunk)
})
child.stderr.on('data', chunk => {
  record({ direction: 'err', data: chunk.toString('utf8') })
  process.stderr.write(chunk)
})
child.on('exit', code => process.exit(code ?? 0))
`

/** A project's launcher, which knows its run: its places are written into it. */
const placesWritten = (recording: Recording) => `const { traffic, opened, hook, tunnel } = ${JSON.stringify(recording)}`

/**
 * The package's launcher, which every agent copies where it likes, and which serves every run:
 * it reads its places from the nearest ${RECORDING_FILE} above it, which a run writes into
 * the agent's home, where the agents keep their copies.
 */
const PLACES_FOUND = `const recordingAbove = folder => {
  const path = join(folder, ${JSON.stringify(RECORDING_FILE)})
  if (existsSync(path)) return path
  if (dirname(folder) === folder) throw new Error('offprompt e2e: no ${RECORDING_FILE} in any folder above ' + here)
  return recordingAbove(dirname(folder))
}
const { traffic, opened, hook, tunnel } = JSON.parse(readFileSync(recordingAbove(dirname(here)), 'utf8'))`

/**
 * Loaded ahead of the bundle: the platform's opener, open on macOS, xdg-open on Linux and
 * rundll32 on Windows, writes the page's address down instead of opening a browser, on every
 * platform alike. Any other program starts as it would.
 */
const HOOK = `import childProcess from 'node:child_process'
import { appendFileSync } from 'node:fs'
import { syncBuiltinESMExports } from 'node:module'

const OPENERS = new Set(['open', 'xdg-open', 'rundll32'])
const real = childProcess.spawn
childProcess.spawn = (command, args = [], options) => {
  if (!OPENERS.has(command)) return real(command, args, options)
  appendFileSync(process.env.OFFPROMPT_E2E_OPENED, String(args.at(-1)) + '\\n')
  return real(process.execPath, ['-e', ''], { stdio: 'ignore' })
}
syncBuiltinESMExports()
`

/** Puts the bundle in `folder` aside as mcp.real.mjs, and the launcher in its place. */
const swapBundle = async ({ folder, places }: { folder: string; places: string }) => {
  await rename(join(folder, 'mcp.mjs'), join(folder, 'mcp.real.mjs'))
  await writeFile(join(folder, 'mcp.mjs'), shim(places))
}

/**
 * Swaps the project's bundle for the recording launcher, and says where it records. With
 * `tunnel`, offprompt may expose a sandbox's page through Cloudflare.
 */
export const instrument = async ({ root, artifacts, tunnel = false }: { root: string; artifacts: string; tunnel?: boolean }) => {
  const recording = recordingIn({ artifacts, tunnel })
  await writeFile(join(artifacts, 'opener.mjs'), HOOK)
  await swapBundle({ folder: join(root, 'tools/offprompt'), places: placesWritten(recording) })
  return { traffic: recording.traffic, opened: recording.opened }
}

/**
 * Swaps the bundle of an assembled npm package for the launcher that finds its run in the
 * agent's home, and has the package ship the real bundle beside it.
 */
export const instrumentPackage = async (folder: string) => {
  await swapBundle({ folder: join(folder, 'dist'), places: PLACES_FOUND })
  const path = join(folder, 'package.json')
  const manifest: unknown = JSON.parse(await readFile(path, 'utf8'))
  if (!isObject(manifest) || !isList(manifest.files)) throw new Error(`${path} lists no files to ship`)
  await writeFile(path, `${JSON.stringify({ ...manifest, files: [...manifest.files, 'dist/mcp.real.mjs'] }, null, 2)}\n`)
}

/**
 * Has the launcher of a plugin installed into `home` record this run: wherever an agent copied
 * the plugin under that home, it finds the run there.
 */
export const recordFrom = async ({ home, artifacts, tunnel = false }: { home: string; artifacts: string; tunnel?: boolean }) => {
  const recording = recordingIn({ artifacts, tunnel })
  await writeFile(join(artifacts, 'opener.mjs'), HOOK)
  await writeFile(join(home, RECORDING_FILE), JSON.stringify(recording))
  return { traffic: recording.traffic, opened: recording.opened }
}
