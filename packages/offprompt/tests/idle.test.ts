import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, expect, it } from 'vitest'

import { createIdleReport } from '../src/mcp/idle.js'

const teardowns: (() => Promise<void>)[] = []

afterEach(async () => {
  await Promise.all(teardowns.splice(0).map(teardown => teardown()))
})

const IDLE_MS = 60_000

const setupTest = async ({ open = 0 } = {}) => {
  const folder = await mkdtemp(join(tmpdir(), 'offprompt-idle-'))
  teardowns.push(() => rm(folder, { recursive: true, force: true }))
  const file = join(folder, 'state')
  const now = { ms: 1_000_000 }
  const requests = { open }
  const report = createIdleReport({ file, open: () => requests.open, idleMs: IDLE_MS, clock: () => now.ms })
  /** What the file says once every write so far has landed. */
  const said = async () => {
    report.check()
    await report.settled()
    return readFile(file, 'utf8')
  }
  return { report, now, requests, said }
}

it('says run while the server has just started, and stop once nothing has happened for the wait', async () => {
  const { now, said } = await setupTest()
  expect(await said()).toBe('run')

  now.ms += IDLE_MS
  expect(await said()).toBe('stop')
})

it('never says stop while a tool call runs, however long it takes', async () => {
  const { report, now, said } = await setupTest()
  const done = { finish: () => undefined as void }
  const call = report.during(() => new Promise<void>(resolve => (done.finish = resolve)))

  now.ms += IDLE_MS * 3
  expect(await said()).toBe('run')

  done.finish()
  await call
  expect(await said()).toBe('run')
  now.ms += IDLE_MS
  expect(await said()).toBe('stop')
})

it('never says stop while a request waits for its values', async () => {
  const { now, requests, said } = await setupTest({ open: 1 })
  now.ms += IDLE_MS * 3
  expect(await said()).toBe('run')

  requests.open = 0
  expect(await said()).toBe('stop')
})

it('says run again as soon as a call comes after a stop', async () => {
  const { report, now, said } = await setupTest()
  now.ms += IDLE_MS
  expect(await said()).toBe('stop')

  await report.during(() => Promise.resolve())
  expect(await said()).toBe('run')
})
