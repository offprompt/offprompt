import { chmod } from 'node:fs/promises'
import { join, sep } from 'node:path'
import { afterEach, expect, it } from 'vitest'

import { resolveSink, sinkHolds, sinkWritable, writeToSink, type SinkSpec } from '../src/core/sinks.js'
import { setupWorkspace, WRITTEN_MODE } from './helpers/workspace.js'

const WINDOWS = process.platform === 'win32'

type Workspace = Awaited<ReturnType<typeof setupWorkspace>>

const workspaces: Workspace[] = []

const setupTest = async ({ git = false }: { git?: boolean } = {}) => {
  const workspace = await setupWorkspace({ git })
  workspaces.push(workspace)
  const resolve = (spec: SinkSpec) => resolveSink({ root: workspace.root, spec })
  const holds = (sink: Awaited<ReturnType<typeof resolveSink>>, name: string) =>
    sink.ok ? sinkHolds({ sink: sink.value, name }) : Promise.resolve(false)
  return { ...workspace, resolve, holds }
}

afterEach(async () => {
  await Promise.all(workspaces.splice(0).map(workspace => workspace.cleanup()))
})

it('resolves a dotenv sink to an absolute path inside the project', async () => {
  const { resolve } = await setupTest()
  const sink = await resolve({ kind: 'dotenv', path: '.env' })
  expect(sink.ok && sink.value).toMatchObject({
    kind: 'dotenv',
    relativePath: '.env',
    tracked: false,
    ignored: false,
  })
  expect(sink.ok && sink.value.absolutePath.endsWith(`${sep}.env`)).toBe(true)
})

it('refuses a sink outside the project', async () => {
  const { resolve } = await setupTest()
  const sink = await resolve({ kind: 'dotenv', path: '../.env' })
  expect(sink).toEqual({ ok: false, message: 'the sink path is outside the project' })
})

it('reports an overwrite per key, not per file', async () => {
  const { resolve, holds, write } = await setupTest()
  await write('.env', 'TOKEN=old\n')
  const sink = await resolve({ kind: 'dotenv', path: '.env' })

  expect(await holds(sink, 'TOKEN')).toBe(true)
  expect(await holds(sink, 'OTHER')).toBe(false)
})

it('reports an overwrite when the file sink already exists', async () => {
  const { resolve, holds, write } = await setupTest()
  await write('id.pem', 'old')
  const sink = await resolve({ kind: 'file', path: 'id.pem' })
  expect(await holds(sink, 'ANY')).toBe(true)
})

it('reports a gitignored target as ignored', async () => {
  const { resolve, write } = await setupTest({ git: true })
  await write('.gitignore', '.env\n')
  const sink = await resolve({ kind: 'dotenv', path: '.env' })
  expect(sink.ok && sink.value).toMatchObject({ ignored: true, tracked: false })
})

it('reports a committed target as tracked', async () => {
  const { resolve, write, track } = await setupTest({ git: true })
  await write('.env', 'PORT=3000\n')
  await track('.env')
  const sink = await resolve({ kind: 'dotenv', path: '.env' })
  expect(sink.ok && sink.value).toMatchObject({ tracked: true, ignored: false })
})

it('writes a new dotenv key readable by its owner alone, where files carry a mode', async () => {
  const { resolve, read, modeOf, exists } = await setupTest()
  expect(await exists('.env')).toBe(false)
  const sink = await resolve({ kind: 'dotenv', path: '.env' })
  if (!sink.ok) throw new Error(sink.message)

  const written = await writeToSink({ sink: sink.value, values: [{ name: 'TOKEN', value: 're_abc123' }], allowTracked: false })

  expect(written.ok).toBe(true)
  expect(await read('.env')).toBe('TOKEN=re_abc123\n')
  expect(await modeOf('.env')).toBe(WRITTEN_MODE)
})

it('leaves the rest of an existing dotenv file untouched', async () => {
  const { resolve, read, write } = await setupTest()
  await write('.env', '# keep me\nPORT=3000\nTOKEN=old\n')
  const sink = await resolve({ kind: 'dotenv', path: '.env' })
  if (!sink.ok) throw new Error(sink.message)

  await writeToSink({ sink: sink.value, values: [{ name: 'TOKEN', value: 'new' }], allowTracked: false })

  expect(await read('.env')).toBe('# keep me\nPORT=3000\nTOKEN=new\n')
})

it('writes a file sink as the whole file, with no trailing newline added', async () => {
  const { resolve, read, modeOf } = await setupTest()
  const sink = await resolve({ kind: 'file', path: 'secrets/id.pem' })
  if (!sink.ok) throw new Error(sink.message)

  const pem = '-----BEGIN PRIVATE KEY-----\nMIIBabc\n-----END PRIVATE KEY-----'
  const written = await writeToSink({ sink: sink.value, values: [{ name: 'KEY', value: pem }], allowTracked: false })

  expect(written.ok).toBe(true)
  expect(await read('secrets/id.pem')).toBe(pem)
  expect(await modeOf('secrets/id.pem')).toBe(WRITTEN_MODE)
})

it('refuses a git-tracked target', async () => {
  const { resolve, read, write, track } = await setupTest({ git: true })
  await write('.env', 'PORT=3000\n')
  await track('.env')
  const sink = await resolve({ kind: 'dotenv', path: '.env' })
  if (!sink.ok) throw new Error(sink.message)

  const written = await writeToSink({ sink: sink.value, values: [{ name: 'TOKEN', value: 'secret' }], allowTracked: false })

  expect(written).toEqual({ ok: false, message: 'that file is tracked by git, so the values would be committed' })
  expect(await read('.env')).toBe('PORT=3000\n')
})

it('writes a git-tracked target once the human has overridden', async () => {
  const { resolve, read, write, track } = await setupTest({ git: true })
  await write('.env', 'PORT=3000\n')
  await track('.env')
  const sink = await resolve({ kind: 'dotenv', path: '.env' })
  if (!sink.ok) throw new Error(sink.message)

  const written = await writeToSink({ sink: sink.value, values: [{ name: 'TOKEN', value: 'secret' }], allowTracked: true })

  expect(written.ok).toBe(true)
  expect(await read('.env')).toBe('PORT=3000\nTOKEN=secret\n')
})

it('refuses a value a dotenv file cannot carry and writes nothing', async () => {
  const { resolve, exists } = await setupTest()
  const sink = await resolve({ kind: 'dotenv', path: '.env' })
  if (!sink.ok) throw new Error(sink.message)

  const written = await writeToSink({ sink: sink.value, values: [{ name: 'TOKEN', value: `"it's` }], allowTracked: false })

  expect(written.ok).toBe(false)
  expect(await exists('.env')).toBe(false)
})

it('writes a batch of keys in one pass', async () => {
  const { resolve, read, write } = await setupTest()
  await write('.env', '# keep\nPORT=3000\n')
  const sink = await resolve({ kind: 'dotenv', path: '.env' })
  if (!sink.ok) throw new Error(sink.message)

  const written = await writeToSink({
    sink: sink.value,
    values: [
      { name: 'API_SECRET_A', value: 'some_secret_a' },
      { name: 'API_SECRET_B', value: 'some secret with b and spaces' },
    ],
    allowTracked: false,
  })

  expect(written.ok).toBe(true)
  expect(await read('.env')).toBe(
    "# keep\nPORT=3000\nAPI_SECRET_A=some_secret_a\nAPI_SECRET_B='some secret with b and spaces'\n",
  )
})

it('writes none of a batch when one value cannot be stored', async () => {
  const { resolve, read, write } = await setupTest()
  await write('.env', 'PORT=3000\n')
  const sink = await resolve({ kind: 'dotenv', path: '.env' })
  if (!sink.ok) throw new Error(sink.message)

  const written = await writeToSink({
    sink: sink.value,
    values: [
      { name: 'GOOD', value: 'fine' },
      { name: 'BAD', value: `"it's` },
    ],
    allowTracked: false,
  })

  expect(written.ok).toBe(false)
  expect(await read('.env')).toBe('PORT=3000\n')
})

it('refuses a batch on a file sink, which holds one value', async () => {
  const { resolve } = await setupTest()
  const sink = await resolve({ kind: 'file', path: 'id.pem' })
  if (!sink.ok) throw new Error(sink.message)

  const written = await writeToSink({
    sink: sink.value,
    values: [
      { name: 'A', value: 'one' },
      { name: 'B', value: 'two' },
    ],
    allowTracked: false,
  })

  expect(written).toEqual({ ok: false, message: 'a file sink holds exactly one value' })
})

// Windows ignores a file's or a folder's mode, so neither can be locked this way there.
it.skipIf(WINDOWS)('refuses to write over a dotenv file it cannot read, rather than dropping its other keys', async () => {
  const { resolve, write, read, root } = await setupTest()
  await write('.env', 'PORT=3000\nTOKEN=old\n')
  const sink = await resolve({ kind: 'dotenv', path: '.env' })
  if (!sink.ok) throw new Error(sink.message)
  await chmod(join(root, '.env'), 0o200)

  const written = await writeToSink({ sink: sink.value, values: [{ name: 'TOKEN', value: 'new' }], allowTracked: false })
  expect(await sinkWritable(sink.value)).toBe(false)
  await chmod(join(root, '.env'), 0o600)

  expect(written).toMatchObject({ ok: false, message: expect.stringContaining('EACCES') as unknown })
  expect(await read('.env')).toBe('PORT=3000\nTOKEN=old\n')
})

it.skipIf(WINDOWS)('says a file in a folder that takes no new files cannot be written, and names the folder', async () => {
  const { resolve, write, root } = await setupTest()
  await write('.env', 'PORT=3000\n')
  const sink = await resolve({ kind: 'dotenv', path: '.env' })
  if (!sink.ok) throw new Error(sink.message)
  await chmod(root, 0o500)

  const writable = await sinkWritable(sink.value)
  const written = await writeToSink({ sink: sink.value, values: [{ name: 'TOKEN', value: 'new' }], allowTracked: false })
  await chmod(root, 0o700)

  expect(writable).toBe(false)
  expect(written).toEqual({ ok: false, message: `EACCES: could not create a file in ${sink.value.absolutePath.replace(/\/\.env$/, '')}` })
})
