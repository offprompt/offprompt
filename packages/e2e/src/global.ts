import { execFile } from 'node:child_process'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { promisify } from 'node:util'

import type { Agent } from './agents.js'
import { instrumentPackage, recordFrom } from './instrument.js'
import { runCommand } from './process.js'
import { artifactsFor } from './project.js'

const run = promisify(execFile)

/** What `pnpm package` runs, which assembles the npm package offprompt in a directory. */
const PACKAGER = join(dirname(createRequire(import.meta.url).resolve('@offprompt/install/package.json')), 'scripts/package.mjs')

/** npm starts slowly on Windows, and init -g runs each agent's own plugin commands. */
const NPM_TIMEOUT_MS = 3 * 60_000

const isPackReport = (value: unknown): value is readonly { readonly filename: string }[] =>
  Array.isArray(value) &&
  value.every((item: unknown) => typeof item === 'object' && item !== null && 'filename' in item && typeof item.filename === 'string')

/**
 * The npm package offprompt, assembled as `pnpm package` assembles it and packed by `npm pack`
 * as it is published, with the recording launcher in place of its bundle. The agents copy the
 * plugin into caches of their own as they install it, so the launcher travels inside the
 * package rather than being swapped into one copy afterwards. The tarball is kept with the run.
 */
const pack = async () => {
  const assembled = await mkdtemp(join(tmpdir(), 'offprompt-e2e-package-'))
  try {
    await run(process.execPath, [PACKAGER, assembled])
    await instrumentPackage(assembled)
    const destination = await artifactsFor('package')
    const npm = await runCommand({
      command: 'npm',
      args: ['pack', '--json', '--pack-destination', destination],
      cwd: assembled,
      timeoutMs: NPM_TIMEOUT_MS,
    })
    const report: unknown = npm.code === 0 ? JSON.parse(npm.stdout) : undefined
    const [packed] = isPackReport(report) ? report : []
    if (packed === undefined) throw new Error(`npm pack exited with ${String(npm.code)}: ${npm.stdout}${npm.stderr}`)
    return join(destination, packed.filename)
  } finally {
    await rm(assembled, { recursive: true, force: true })
  }
}

/** One tarball for every global install in the run. */
const packing: { tarball?: Promise<string> } = {}

const packed = () => {
  packing.tarball ??= pack()
  return packing.tarball
}

/**
 * Installs offprompt for the agent the way a person installs it for themselves, with
 * `npx offprompt init -g` from the packed package, and says where its launcher records. HOME
 * and the agent's own folder point into `home`, so the plugin is settled and registered there
 * and nothing of this machine's is touched. What the install printed goes with the run.
 */
export const installGlobally = async ({
  agent,
  home,
  artifacts,
  tunnel,
}: {
  agent: Agent
  home: string
  artifacts: string
  tunnel: boolean
}) => {
  const recording = await recordFrom({ home, artifacts, tunnel })
  const installed = await runCommand({
    command: 'npx',
    args: ['--yes', `--package=${await packed()}`, 'offprompt', 'init', '-g', '--agent', agent.name],
    cwd: home,
    env: agent.mocked.env(home),
    timeoutMs: NPM_TIMEOUT_MS,
  })
  const printed = `${installed.stdout}${installed.stderr}`
  await writeFile(join(artifacts, 'install.txt'), printed)
  if (installed.code !== 0) throw new Error(`offprompt init -g --agent ${agent.name} exited with ${String(installed.code)}:\n${printed}`)
  return recording
}
