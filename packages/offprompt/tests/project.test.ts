import { homedir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { expect, it } from 'vitest'

import { projectFinder, type Root } from '../src/mcp/project.js'

/** Folders as this platform writes them: on Windows, on the current drive, with backslashes. */
const OWN = resolve('/Users/someone/.local/share/offprompt')

const PROJECT = resolve('/Users/someone/projects/acme')

const WINDOWS = process.platform === 'win32'

const rootsOf = (...directories: readonly string[]): readonly Root[] =>
  directories.map(directory => ({ uri: pathToFileURL(directory).href }))

const findFrom = ({ cwd, roots = [] }: { cwd: string; roots?: readonly Root[] }) =>
  projectFinder({ cwd, own: OWN, listRoots: () => Promise.resolve(roots), env: {} })()

it('takes the working directory when the client names no roots, as Claude Code does', async () => {
  expect(await findFrom({ cwd: PROJECT })).toEqual({ ok: true, value: PROJECT })
})

it('keeps the working directory when it lies inside one of the roots', async () => {
  const cwd = join(PROJECT, 'services/api')
  expect(await findFrom({ cwd, roots: rootsOf(resolve('/Users/someone/notes'), PROJECT) })).toEqual({ ok: true, value: cwd })
})

it("takes the client's first root when it started offprompt in offprompt's own folder", async () => {
  const roots = rootsOf(PROJECT, resolve('/Users/someone/projects/shared'))
  expect(await findFrom({ cwd: OWN, roots })).toEqual({ ok: true, value: PROJECT })
  expect(await findFrom({ cwd: join(OWN, 'bin'), roots })).toEqual({ ok: true, value: PROJECT })
})

it('takes the home directory when the client names it as its workspace', async () => {
  expect(await findFrom({ cwd: homedir(), roots: rootsOf(homedir()) })).toEqual({ ok: true, value: homedir() })
})

it('takes the first root when the working directory lies outside all of them', async () => {
  expect(await findFrom({ cwd: resolve('/tmp/elsewhere'), roots: rootsOf(PROJECT) })).toEqual({ ok: true, value: PROJECT })
})

it('skips roots that are not folders', async () => {
  const roots = [{ uri: 'https://example.com/repo' }, ...rootsOf(PROJECT)]
  expect(await findFrom({ cwd: OWN, roots })).toEqual({ ok: true, value: PROJECT })
})

// On Windows a file URL naming another host is a network share, a folder offprompt can open.
it.skipIf(WINDOWS)('skips a file URL on another host, which names no folder on this machine', async () => {
  const roots = [{ uri: 'file://build-host/srv/acme' }, ...rootsOf(PROJECT)]
  expect(await findFrom({ cwd: OWN, roots })).toEqual({ ok: true, value: PROJECT })
})

it('takes a root given as a bare path, where the protocol wants a file URL', async () => {
  expect(await findFrom({ cwd: OWN, roots: [{ uri: 'vscode-vfs://github/acme' }, { uri: PROJECT }] })).toEqual({
    ok: true,
    value: PROJECT,
  })
})

it('takes the folders Cursor names in the environment it starts offprompt with', async () => {
  const find = projectFinder({
    cwd: homedir(),
    own: OWN,
    listRoots: () => Promise.resolve([]),
    env: { WORKSPACE_FOLDER_PATHS: PROJECT },
  })

  expect(await find()).toEqual({ ok: true, value: PROJECT })
})

it('takes the workspaces a host names in the call, for one that offers no roots', async () => {
  const meta = { 'x-codex-turn-metadata': { session_id: 'abc', workspaces: { [PROJECT]: { has_changes: true } } } }
  const find = projectFinder({ cwd: OWN, own: OWN, listRoots: () => Promise.resolve([]), env: {} })

  expect(await find({ meta })).toEqual({ ok: true, value: PROJECT })
  expect((await find({ meta: { workspaces: { [PROJECT]: {} } } })).ok).toBe(false)
})

it('refuses rather than write into the home directory, the filesystem root or its own folder', async () => {
  const home = await findFrom({ cwd: homedir() })
  const root = await findFrom({ cwd: '/' })
  const own = await findFrom({ cwd: OWN })

  expect([home.ok, root.ok, own.ok]).toEqual([false, false, false])
  const message = root.ok ? '' : root.message
  expect(message).toContain('offprompt runs in /,')
  expect(message).toContain('Stop here and tell the user')
  expect(message).toContain('Do not start offprompt or talk to its server yourself')
})
