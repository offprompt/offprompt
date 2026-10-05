import { mkdtemp, realpath, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

import type { Agent, Moment } from './agents.js'
import { installGlobally } from './global.js'
import { instrument } from './instrument.js'
import { collectSessions, filesUnder, projectFiles, prune, sessionFilesOf } from './leaks.js'
import { startModel, type Call } from './model.js'
import { fillPage, waitForPage } from './page.js'
import { readIfPresent, runCommand } from './process.js'
import { artifactsFor, setupProject } from './project.js'
import { field, readTraffic } from './traffic.js'

const AGENT_TIMEOUT_MS = 6 * 60_000

type Typed = Readonly<Record<string, string>>

/** Several pages' values, rather than one page's. */
const isPages = (values: Typed | readonly Typed[]): values is readonly Typed[] => Array.isArray(values)

/**
 * What the agent said to the person between the result that carried a fingerprint and its
 * next tool call: where the fingerprint belongs, while the page is still open.
 */
const saidAfterWrite = ({ timeline, emoji }: { timeline: readonly Moment[]; emoji: string }) => {
  const at = timeline.findIndex(moment => moment.kind === 'returned' && moment.text.includes(emoji))
  if (at === -1) return undefined
  const rest = timeline.slice(at + 1)
  const next = rest.findIndex(moment => moment.kind === 'called')
  return (next === -1 ? rest : rest.slice(0, next)).flatMap(moment => (moment.kind === 'said' ? [moment.text] : [])).join('\n')
}

/** A line that names offprompt's server, as the agents log it, rather than a path with offprompt in it. */
const NAMES_SERVER = /\boffprompt\b(?![-/\\.])/

const FAILED = /fail|denied|not recognized|not a valid|cannot|ENOENT|EACCES|EFTYPE|os error/i

/**
 * What the agent logged about offprompt's server failing, in its own words, out of its stderr
 * and its debug log: why a server it could not start failed, such as the launcher on a
 * platform that cannot run it.
 */
const troubleIn = (logs: readonly string[]) =>
  logs
    .flatMap(log => log.split('\n'))
    .filter(line => NAMES_SERVER.test(line) && FAILED.test(line))
    .map(line => line.trim().slice(0, 500))

/**
 * A scripted model for the run and a home folder of its own for the agent, where the run plays
 * `calls` instead of asking the agent's provider.
 */
const mockFor = async ({ agent, calls, artifacts }: { agent: Agent; calls: readonly Call[]; artifacts: string }) => {
  const model = await startModel({ calls, log: join(artifacts, 'model.jsonl') })
  // The real path, as for the project, since that is the one agents keep their copies under.
  const home = await realpath(await mkdtemp(join(tmpdir(), `offprompt-e2e-home-${agent.name}-`)))
  await agent.mocked.prepare?.({ home, model: model.url })
  return { model, home, log: join(artifacts, 'model.jsonl') }
}

/**
 * Installs offprompt into a fresh project, or for the agent itself, has the agent run the prompt
 * there, and fills the page with the values when one opens. Everything the run produced is kept
 * for reading. With `model`, the agent runs against a scripted model playing those calls, with
 * no account.
 */
export const runScenario = async ({
  agent,
  scenario,
  prompt,
  values,
  from,
  model,
  environment = {},
  install = 'project',
  tunnel = false,
}: {
  agent: Agent
  scenario: string
  prompt: string
  /**
   * What to type on each page, by key, one entry per page in the order they open; a run that
   * expects no page has none.
   */
  values?: Typed | readonly Typed[]
  /** The project to start from, under projects/; an empty one otherwise. */
  from?: string
  /** The calls a scripted model plays in place of the agent's provider. */
  model?: readonly Call[]
  /** What the agent's environment holds on top of this one's, such as the signs of where it runs. */
  environment?: Readonly<Record<string, string>>
  /**
   * Where offprompt comes from: the project, or the plugin `npx offprompt init -g` installs for
   * the agent itself, which needs the scripted model's home to install into.
   */
  install?: 'project' | 'global'
  /** Whether offprompt may expose a sandbox's page through a real Cloudflare quick tunnel. */
  tunnel?: boolean
}) => {
  if (model === undefined) await agent.prepare?.()
  const project = await setupProject({
    agent: agent.name,
    install: install === 'project',
    ...(from === undefined ? {} : { from }),
  })
  const artifacts = await artifactsFor(`${agent.name}-${scenario}`)
  const mock = model === undefined ? undefined : await mockFor({ agent, calls: model, artifacts })
  const { traffic, opened } = await (async () => {
    if (install === 'project') return instrument({ root: project.root, artifacts, tunnel })
    if (mock === undefined) throw new Error('a global install runs against the scripted model, in a home of its own')
    return installGlobally({ agent, home: mock.home, artifacts, tunnel })
  })()
  const sessionsDir = mock === undefined ? agent.sessions : agent.mocked.sessions(mock.home)

  const { command, args, env } =
    mock === undefined
      ? agent.command({ root: project.root, prompt })
      : agent.mocked.command({ root: project.root, prompt, home: mock.home, model: mock.model.url, artifacts })
  const started = Date.now()
  const finished = new AbortController()
  const running = runCommand({ command, args, cwd: project.root, timeoutMs: AGENT_TIMEOUT_MS, env: { ...environment, ...env } })
  void running.finally(() => finished.abort())

  const perPage = values === undefined ? [] : isPages(values) ? values : [values]
  // Each page in turn: the agent asks for the next only once the last is written.
  const filled = await perPage.reduce<Promise<readonly { url: string; emoji: string | undefined }[]>>(async (done, typed) => {
    const before = await done
    const url = await waitForPage({ sources: [opened, traffic], finished: finished.signal, filled: before.map(page => page.url) })
    return url === undefined ? before : [...before, { url, emoji: await fillPage({ url, values: typed }) }]
  }, Promise.resolve([]))
  const page = filled[0]?.url
  const pageEmoji = filled[0]?.emoji
  const output = await running
  await mock?.model.close()
  /** What the host passed back to the model as each tool's result, in order. */
  const modelSaw = mock === undefined ? [] : (mock.model.taken().at(-1)?.results ?? [])

  await writeFile(join(artifacts, 'stdout.txt'), output.stdout)
  await writeFile(join(artifacts, 'stderr.txt'), output.stderr)
  const sessions = await sessionFilesOf({ dir: sessionsDir, since: started, root: project.root })
  await collectSessions({ files: sessions, artifacts, top: sessionsDir })
  const recorded = await readTraffic(traffic)
  /** Whether offprompt opened the page in a browser, as the person would have seen it. */
  const inBrowser = (await readIfPresent(opened)).trim() !== ''
  const reply = agent.reply(output.stdout)
  const timeline = agent.timeline(output.stdout)
  // What the agent said after each write that carried a fingerprint, in the order they came.
  const saidAfterWrites = recorded.results.flatMap(result => {
    const emoji = field(result.payload, 'emoji')
    return field(result.payload, 'status') === 'written' && typeof emoji === 'string'
      ? [{ emoji, said: saidAfterWrite({ timeline, emoji }) }]
      : []
  })
  const said = saidAfterWrites[0]?.said
  const { debugLog } = agent.mocked
  const logged = mock === undefined || debugLog === undefined ? '' : await readIfPresent(join(artifacts, debugLog))
  const summary = {
    agent: agent.name,
    scenario,
    exit: output.code,
    timedOut: output.timedOut,
    client: recorded.client,
    clients: recorded.clients,
    capabilities: recorded.capabilities,
    serverCwd: recorded.cwd,
    /** Where offprompt came from, and the bundle the agent started: the project's, or a plugin's copy. */
    install,
    server: recorded.server,
    /** What the agent said went wrong with offprompt's server, such as why it could not start it. */
    serverTrouble: troubleIn([output.stderr, logged]),
    tunnel,
    project: project.root,
    askedRoots: recorded.askedRoots,
    /** Whether the agent passed `sandbox: true`, which offprompt sets aside on a Mac with no SSH session. */
    sandboxFlag: recorded.results.some(result => field(result.arguments, 'sandbox') === true),
    // How the page reached the person: a dialog the agent did not accept moves on to the browser.
    page: page === undefined ? 'none' : inBrowser ? (recorded.elicited ? 'browser, after a dialog' : 'browser') : recorded.elicited ? 'agent dialog' : 'link in the result',
    calls: recorded.results.map(({ client, name, isError, payload, meta }) => ({ client, name, isError, payload, meta })),
    pageEmoji,
    pageEmojis: filled.map(each => each.emoji),
    /** What the agent said right after each write, before its next tool call. */
    saidAfterWrites,
    reply,
    sessionFiles: sessions.length,
    modelSaw,
    artifacts,
  }
  await writeFile(join(artifacts, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`)

  /**
   * Everywhere a value could have been copied to: everything the run kept, which is the MCP
   * traffic both ways, all the agent printed, the requests the scripted model took, the agent's
   * own record of the session and its debug log, and every project file but `.env`.
   */
  const places = [...(await filesUnder(artifacts)), ...(await projectFiles(project.root))]

  /**
   * Pi writes its session folder again as it exits, so cleaning up takes it out once more. A
   * home a plugin ran from may be held a moment longer on Windows, by a server on its way out.
   */
  const cleanup = async () => {
    await project.cleanup()
    if (mock !== undefined) {
      await rm(mock.home, { recursive: true, force: true, maxRetries: 10 })
      return
    }
    await agent.forget?.(project.root)
    await Promise.all([...new Set(sessions.map(dirname))].map(dir => prune(dir, agent.sessions)))
  }

  return {
    project,
    /** The agent's own home, where a global install put offprompt; none for a run with your login. */
    home: mock?.home,
    cleanup,
    output,
    traffic: recorded,
    page,
    inBrowser,
    pageEmoji,
    pageEmojis: filled.map(each => each.emoji),
    saidAfterWrite: said,
    saidAfterWrites,
    reply,
    sessions,
    places,
    modelSaw,
    summary,
  }
}
