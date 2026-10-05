import { chmod, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, expect, it } from 'vitest'

import { onPath } from '../src/commands.js'

const teardowns: (() => Promise<void>)[] = []

afterEach(async () => {
  await Promise.all(teardowns.splice(0).map(teardown => teardown()))
})

/** A folder on PATH holding one file, marked executable where files carry the mark. */
const folderWith = async (file: string) => {
  const folder = await mkdtemp(join(tmpdir(), 'offprompt-commands-'))
  teardowns.push(() => rm(folder, { recursive: true, force: true }))
  await writeFile(join(folder, file), '')
  await chmod(join(folder, file), 0o755)
  return folder
}

it('finds a CLI npm installed on Windows as a .cmd, by the extensions Windows tries', async () => {
  const folder = await folderWith('claude.cmd')

  expect(await onPath('claude', folder, { platform: 'win32', pathext: '.COM;.EXE;.BAT;.CMD' })).toBe(true)
  expect(await onPath('claude', folder, { platform: 'win32', pathext: '.EXE' })).toBe(false)
})

it('looks for the bare name alone elsewhere', async () => {
  const folder = await folderWith('claude.cmd')

  expect(await onPath('claude', folder, { platform: 'darwin', pathext: '.CMD' })).toBe(false)
  expect(await onPath('claude', await folderWith('claude'), { platform: 'darwin', pathext: '' })).toBe(true)
})
