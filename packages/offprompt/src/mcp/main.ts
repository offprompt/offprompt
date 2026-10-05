import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { z } from 'zod'

import { note } from '../core/log.js'
import { createRequestStore, type SecretRequest } from '../core/store.js'
import { VERSION } from '../version.js'
import { startLoopbackServer } from '../web/server.js'
import { findCloudflared } from './cloudflared.js'
import { createIdleReport, IDLE_MS } from './idle.js'
import { createPresenter } from './present.js'
import { projectFinder, type Root } from './project.js'
import { tunnelAllowed, whereabouts } from './remote.js'
import { registerTools } from './tools.js'
import { createTunnelManager } from './tunnel.js'

const INSTRUCTIONS = `offprompt asks the human for a value only they have — an API key, a token, a password, a
private key — and writes it where the project reads it.

When a task needs one, call collect_secret with every key you need at once. It waits while the human types and
returns once the values are written, with the key names and the file, never the values.

When your environment tells you that you run in a cloud sandbox or a remote VM, set sandbox: true. The call returns a
link: show it to the user in your reply, on its own line, since nothing happens until they open it. Then await_secret
waits for the values.

Never open, cat, grep or print the file the values landed in. Reading it puts the values into the transcript.

Reach offprompt only through these tools. When it refuses, tell the user what it said and stop: never start its server
or talk to it yourself.`

/** How long a client gets to name its roots before the working directory stands in. */
const ROOTS_TIMEOUT_MS = 5000

/**
 * Roots as a client sends them, read loosely. The protocol wants a file URL in each, and a
 * strict read drops every root when one is anything else, as a Cursor window can send.
 */
const LooseRoots = z.object({ roots: z.array(z.object({ uri: z.string() })) })

/** The folder offprompt runs from: the plugin's root, one above the bundle in `dist/`. */
const OWN = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/**
 * The launcher that starts this server on a tool call, where there is one, names a file for it
 * to say when it may be stopped, and how long it waits first; tests shorten the wait.
 */
const idleReportFor = (store: { openCount: () => number }) => {
  const file = process.env.OFFPROMPT_STATE_FILE
  if (file === undefined || file === '') return undefined
  const seconds = Number(process.env.OFFPROMPT_IDLE_SECONDS)
  const idleMs = Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : IDLE_MS
  return createIdleReport({ file, open: store.openCount, idleMs })
}

const shutdown = async ({ close }: { close: () => Promise<void> }) => {
  await close()
  process.exit(0)
}

const main = async () => {
  const cwd = process.cwd()
  const store = createRequestStore()

  const server = new McpServer(
    { name: 'offprompt', version: VERSION },
    { capabilities: { tools: {} }, instructions: INSTRUCTIONS },
  )

  /** Lets a host that opened its own URL dialog dismiss it once the value has landed. */
  const completeElicitation = (request: SecretRequest) => {
    // The same truthiness test the SDK applies before it throws on a missing capability.
    if (!server.server.getClientCapabilities()?.elicitation?.url) return
    void server.server.createElicitationCompletionNotifier(request.id)().catch(() => undefined)
  }

  const offersRoots = () => server.server.getClientCapabilities()?.roots !== undefined

  // Which program is on the other end, as it said at initialize. Logged so new hosts can join the list.
  server.server.oninitialized = () => {
    const client = server.server.getClientVersion()
    const roots = offersRoots() ? ', names its roots' : ''
    note(`client: ${client === undefined ? 'unknown' : `${client.name} ${client.version}`}${roots}`)
  }

  const listRoots = async (): Promise<readonly Root[]> => {
    if (!offersRoots()) return []
    return server.server.request({ method: 'roots/list' }, LooseRoots, { timeout: ROOTS_TIMEOUT_MS }).then(
      ({ roots }) => {
        // Logged, so a host that names its roots some other way can be taught to.
        roots.filter(root => !root.uri.startsWith('file:')).forEach(root => note(`roots: not a file URL: ${root.uri}`))
        return roots
      },
      (error: unknown) => {
        note(`roots: ${error instanceof Error ? error.message : String(error)}`)
        return []
      },
    )
  }

  const loopback = await startLoopbackServer({ store, onWritten: completeElicitation })
  const tunnel = createTunnelManager({
    port: loopback.port,
    findBinary: () => findCloudflared(),
    onHost: loopback.answerTo,
  })
  const present = createPresenter({
    server: server.server,
    loopback,
    tunnelUrl: tunnelAllowed() ? tunnel.url : () => Promise.resolve(undefined),
  })

  const idle = idleReportFor(store)
  registerTools({
    server,
    store,
    loopback,
    present,
    project: projectFinder({ cwd, own: OWN, listRoots }),
    where: whereabouts(),
    ...(idle === undefined ? {} : { during: idle.during }),
  })

  const close = async () => {
    await tunnel.close()
    await loopback.close()
    await server.close()
  }

  process.once('SIGINT', () => void shutdown({ close }))
  process.once('SIGTERM', () => void shutdown({ close }))
  // A client ending the session may only close stdin. The loopback server would otherwise
  // keep this process alive after its session is gone, holding its port open.
  process.stdin.once('close', () => void shutdown({ close }))

  await server.connect(new StdioServerTransport())
  note(`listening on ${loopback.origin} in ${cwd}`)
}

await main().catch((error: unknown) => {
  note(`failed to start: ${error instanceof Error ? error.message : String(error)}`)
  process.exit(1)
})
