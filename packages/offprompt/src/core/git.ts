import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const run = promisify(execFile)

export type GitStatus = { readonly tracked: boolean; readonly ignored: boolean }

const succeeds = async (cwd: string, args: readonly string[]) =>
  run('git', [...args], { cwd })
    .then(() => true)
    .catch(() => false)

/**
 * Whether git already tracks the target and whether it is ignored. Both answers are
 * `false` outside a repository, which is also how a missing `git` binary reads.
 */
export const gitStatusOf = async ({
  cwd,
  absolutePath,
}: {
  cwd: string
  absolutePath: string
}): Promise<GitStatus> => {
  const [tracked, ignored] = await Promise.all([
    succeeds(cwd, ['ls-files', '--error-unmatch', '--', absolutePath]),
    succeeds(cwd, ['check-ignore', '--quiet', '--', absolutePath]),
  ])
  return { tracked, ignored }
}
