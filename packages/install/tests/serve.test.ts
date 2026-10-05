import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { execFile, spawnSync } from 'node:child_process'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { afterEach, expect, it } from 'vitest'

const run = promisify(execFile)

const PACKAGE = fileURLToPath(new URL('../scripts/package.mjs', import.meta.url))

const teardowns: (() => Promise<void>)[] = []

// Last in, first out, one after another: a server has to stop before Windows lets its folder go.
afterEach(async () => {
  await teardowns
    .splice(0)
    .reverse()
    .reduce((done, teardown) => done.then(teardown), Promise.resolve())
})

const scratch = async (prefix: string) => {
  const path = await mkdtemp(join(tmpdir(), prefix))
  teardowns.push(() => rm(path, { recursive: true, force: true }))
  return path
}

/** The npm package as `pnpm package` assembles it, and a project for its server to run in. */
const setupTest = async () => {
  const plugin = await scratch('offprompt-package-')
  const project = await scratch('offprompt-project-')
  await run(process.execPath, [PACKAGE, plugin])
  return { plugin, project, cli: join(plugin, 'dist/offprompt-install.mjs') }
}

it('runs the server on stdio, in the directory it runs in', async () => {
  const { cli, project } = await setupTest()
  const client = new Client({ name: 'offprompt-serve-test', version: 'test' })
  await client.connect(new StdioClientTransport({ command: process.execPath, args: [cli, 'mcp'], cwd: project, stderr: 'ignore' }))
  teardowns.push(() => client.close())

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
  expect(await readFile(join(project, '.env'), 'utf8')).toMatch(/^SESSION_SECRET=/)
})

it("hands the server the client's streams, and exits with the server's code", async () => {
  const { cli, plugin, project } = await setupTest()
  // A stand-in for the server: it echoes its input, says something on stderr, and exits with 7.
  await writeFile(
    join(plugin, 'dist/mcp.mjs'),
    "process.stderr.write('from the server\\n')\nprocess.stdin.pipe(process.stdout)\nprocess.stdin.on('end', () => { process.exitCode = 7 })\n",
  )

  const { status, stdout, stderr } = spawnSync(process.execPath, [cli, 'mcp'], { cwd: project, input: 'ping\n', encoding: 'utf8' })

  expect({ status, stdout, stderr }).toEqual({ status: 7, stdout: 'ping\n', stderr: 'from the server\n' })
})
