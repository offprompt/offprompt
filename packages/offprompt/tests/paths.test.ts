import { symlink } from 'node:fs/promises'
import { join } from 'node:path'
import { afterEach, expect, it } from 'vitest'

import { resolveInsideRoot } from '../src/core/paths.js'
import { setupWorkspace } from './helpers/workspace.js'

const workspaces: Array<{ cleanup: () => Promise<void> }> = []

const setupTest = async () => {
  const workspace = await setupWorkspace()
  workspaces.push(workspace)
  return workspace
}

afterEach(async () => {
  await Promise.all(workspaces.splice(0).map(workspace => workspace.cleanup()))
})

it('resolves a relative path inside the project', async () => {
  const { root } = await setupTest()
  const result = await resolveInsideRoot(root, '.env')
  expect(result.ok).toBe(true)
})

it('resolves a nested path whose directory does not exist yet', async () => {
  const { root } = await setupTest()
  const result = await resolveInsideRoot(root, 'config/secrets/id.pem')
  expect(result.ok && result.value.absolute.endsWith(join('config', 'secrets', 'id.pem'))).toBe(true)
})

it('refuses a path that climbs out with ..', async () => {
  const { root } = await setupTest()
  const result = await resolveInsideRoot(root, '../outside.env')
  expect(result).toEqual({ ok: false, message: 'the sink path is outside the project' })
})

it('refuses an absolute path elsewhere on the machine', async () => {
  const { root } = await setupTest()
  const result = await resolveInsideRoot(root, '/etc/passwd')
  expect(result).toEqual({ ok: false, message: 'the sink path is outside the project' })
})

it('refuses the project directory itself', async () => {
  const { root } = await setupTest()
  const result = await resolveInsideRoot(root, '.')
  expect(result).toEqual({ ok: false, message: 'the sink path is the project directory itself' })
})

it('refuses an empty path', async () => {
  const { root } = await setupTest()
  const result = await resolveInsideRoot(root, '  ')
  expect(result).toEqual({ ok: false, message: 'the sink path is empty' })
})

it('refuses a path carrying a null byte', async () => {
  const { root } = await setupTest()
  const result = await resolveInsideRoot(root, '.env\0.png')
  expect(result).toEqual({ ok: false, message: 'the sink path contains a null byte' })
})

it('refuses a path that only escapes once a symlink is followed', async () => {
  const outside = await setupTest()
  const { root } = await setupTest()
  await symlink(outside.root, join(root, 'escape'))

  const direct = await resolveInsideRoot(root, 'escape/.env')
  expect(direct).toEqual({
    ok: false,
    message: 'the sink path resolves outside the project through a symlink',
  })
})
