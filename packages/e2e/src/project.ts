import { execFile } from 'node:child_process'
import { access, cp, mkdir, mkdtemp, realpath, rm, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

import { readIfPresent } from './process.js'

const run = promisify(execFile)

const INSTALLER = join(
  dirname(createRequire(import.meta.url).resolve('@offprompt/install/package.json')),
  'dist/offprompt-install.mjs',
)

/** One folder per run, kept after it for reading: what the agent printed, and the MCP traffic. */
const RUN = join(fileURLToPath(new URL('../runs', import.meta.url)), new Date().toISOString().replace(/[:.]/g, '-'))

export const artifactsFor = async (name: string) => {
  const folder = join(RUN, name)
  await mkdir(folder, { recursive: true })
  return folder
}

/** Projects a run can start from, each an app with a README that says what it needs. */
const PROJECTS = fileURLToPath(new URL('../projects', import.meta.url))

/**
 * A throwaway git project, with `.env` ignored as a real one would have it, and offprompt
 * installed into it the way a user installs it, unless the agent has it for itself. It starts
 * empty, or as one of the projects.
 */
export const setupProject = async ({ agent, from, install = true }: { agent: string; from?: string; install?: boolean }) => {
  // The real path, since that is the one agents report.
  const root = await realpath(await mkdtemp(join(tmpdir(), `offprompt-e2e-${agent}-`)))
  if (from !== undefined) await cp(join(PROJECTS, from), root, { recursive: true })
  await run('git', ['init', '--quiet'], { cwd: root })
  await writeFile(join(root, '.gitignore'), '.env\n')
  const installed = install ? (await run(process.execPath, [INSTALLER, 'add', '--project', root, '--agent', agent])).stdout : ''

  return {
    root,
    installed,
    read: (relative: string) => readIfPresent(join(root, relative)),
    exists: (relative: string) =>
      access(join(root, relative)).then(
        () => true,
        () => false,
      ),
    cleanup: () => rm(root, { recursive: true, force: true }),
  }
}
