import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { execFile } from 'node:child_process'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { afterEach, expect, it } from 'vitest'

const run = promisify(execFile)

const INSTALLER = fileURLToPath(new URL('../dist/offprompt-install.mjs', import.meta.url))

const teardowns: (() => Promise<void>)[] = []

// One after another: the server has to stop before Windows lets its working directory go.
afterEach(async () => {
  await teardowns.splice(0).reduce((done, teardown) => done.then(teardown), Promise.resolve())
})

const scratch = async (prefix: string) => {
  const path = await mkdtemp(join(tmpdir(), prefix))
  teardowns.push(() => rm(path, { recursive: true, force: true }))
  return path
}

type Declared = { readonly command: string; readonly args: readonly string[] }

const isDeclared = (value: unknown): value is Declared =>
  typeof value === 'object' &&
  value !== null &&
  'command' in value &&
  typeof value.command === 'string' &&
  'args' in value &&
  Array.isArray(value.args) &&
  value.args.every(arg => typeof arg === 'string')

/** One field of a parsed JSON value, if it is an object that has it. */
const field = (value: unknown, key: string): unknown =>
  typeof value === 'object' && value !== null ? Object.entries(value).find(([name]) => name === key)?.[1] : undefined

/** The server an agent's config declares, as the installer wrote it. */
const declaredIn = async (path: string): Promise<Declared> => {
  const config: unknown = JSON.parse(await readFile(path, 'utf8'))
  const server = field(field(config, 'mcpServers'), 'offprompt')
  if (!isDeclared(server)) throw new Error(`${path} declares no offprompt server`)
  return server
}

/**
 * A project install, started the way an agent starts it: the command and arguments the
 * installer wrote, run in the project. The value asked for is generated, so no page opens and
 * the write needs no person; it runs on any machine, a CI runner's included.
 */
it('starts from what a project install declares, and writes a generated value into the project', async () => {
  const project = await scratch('offprompt-start-')
  await run(process.execPath, [INSTALLER, '--project', project, '--agent', 'cursor'])
  const { command, args } = await declaredIn(join(project, '.cursor/mcp.json'))

  const client = new Client({ name: 'offprompt-start-test', version: 'test' })
  await client.connect(new StdioClientTransport({ command, args: [...args], cwd: project, stderr: 'inherit' }))
  teardowns.unshift(() => client.close())

  const { tools } = await client.listTools()
  expect(tools.map(tool => tool.name).sort()).toEqual(['await_secret', 'cancel_secret', 'collect_secret'])

  const result = await client.callTool({
    name: 'collect_secret',
    arguments: {
      secrets: [{ name: 'SESSION_SECRET', generate: {} }],
      reason: 'The session cookie is signed with it.',
      sink: { kind: 'dotenv' },
    },
  })
  expect(result.structuredContent).toMatchObject({ status: 'written' })
  expect(await readFile(join(project, '.env'), 'utf8')).toMatch(/^SESSION_SECRET=[A-Za-z0-9_-]{43}\r?\n$/)
})
