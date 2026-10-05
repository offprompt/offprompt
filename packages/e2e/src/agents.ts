import { access, mkdir, readFile, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'

import { onPath } from './process.js'

const exists = (path: string) =>
  access(path).then(
    () => true,
    () => false,
  )

/** Pi keeps its settings and login here for these runs, away from any Pi of your own. */
export const PI_HOME = join(homedir(), '.local/share/offprompt-e2e/pi')

const PI = '@earendil-works/pi-coding-agent@0.87.1'

/** Whether Pi has a login: its credentials file names at least one provider. Pi creates it empty. */
const piLoggedIn = () =>
  readFile(join(PI_HOME, 'auth.json'), 'utf8').then(
    text => {
      const credentials: unknown = JSON.parse(text)
      return typeof credentials === 'object' && credentials !== null && Object.keys(credentials).length > 0
    },
    () => false,
  )

type Json = Readonly<Record<string, unknown>>

const isObject = (value: unknown): value is Json =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isList = (value: unknown): value is readonly unknown[] => Array.isArray(value)

/** The JSON events an agent printed, one per line. */
const eventsOf = (stdout: string): readonly Json[] =>
  stdout.split('\n').flatMap(line => {
    try {
      const event: unknown = JSON.parse(line)
      return isObject(event) ? [event] : []
    } catch {
      return []
    }
  })

const lastOf = <T>(items: readonly T[]) => items[items.length - 1]

/** A tool result's text, whether the agent printed it as a string or as blocks. */
const textOf = (content: unknown) => {
  if (typeof content === 'string') return content
  return isList(content)
    ? content.map(block => (isObject(block) && typeof block.text === 'string' ? block.text : '')).join('\n')
    : ''
}

/** A command to run, as an agent's CLI takes it. */
type Command = {
  readonly command: string
  readonly args: readonly string[]
  readonly env?: Readonly<Record<string, string>>
}

/**
 * The agent run against the scripted model instead of its provider's, in a home folder of its
 * own: it needs no account, and leaves nothing of yours touched, so it can run anywhere.
 */
export type Mocked = {
  /** Why the agent's CLI cannot run here, or nothing when it can. */
  readonly unready: () => Promise<string | undefined>
  /**
   * The variables that point the agent at its folders in `home`: the agent runs with them, and
   * so does an install made for it, which then lands there and nowhere else.
   */
  readonly env: (home: string) => Readonly<Record<string, string>>
  /** Points the agent's own folder in `home` at the model, before the run. */
  readonly prepare?: (input: { home: string; model: string }) => Promise<void>
  readonly command: (input: { root: string; prompt: string; home: string; model: string; artifacts: string }) => Command
  /** Where the agent keeps its record of each session, in its home. */
  readonly sessions: (home: string) => string
  /** The file in the run's folder the agent writes its debug log to, where it has one apart from stderr. */
  readonly debugLog?: string
}

/** A home folder as each platform reads it: HOME, and USERPROFILE on Windows. */
const homeEnv = (home: string) => ({ HOME: home, USERPROFILE: home })

/** Claude Code's folder in `home`, with nothing that would update it or reach Anthropic on its own. */
const claudeFolders = (home: string) => ({
  ...homeEnv(home),
  CLAUDE_CONFIG_DIR: join(home, '.claude'),
  CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1',
  DISABLE_AUTOUPDATER: '1',
})

/**
 * What Claude Code may call without asking in a run against the scripted model: offprompt's
 * tools as the project's server, or as the plugin's, which a global install names after it.
 */
const MOCKED_TOOLS = ['mcp__offprompt', 'mcp__plugin_offprompt_offprompt'].flatMap(server => [
  `${server}__collect_secret`,
  `${server}__await_secret`,
])

const CLAUDE_DEBUG_LOG = 'claude-debug.txt'

const codexFolders = (home: string) => ({ ...homeEnv(home), CODEX_HOME: join(home, '.codex') })

const piFolders = (home: string) => ({ ...homeEnv(home), PI_CODING_AGENT_DIR: join(home, 'pi') })

/** One thing an agent did, in order: said something to the person, called a tool, or got a tool's result. */
export type Moment =
  | { readonly kind: 'said'; readonly text: string }
  | { readonly kind: 'called'; readonly name: string }
  | { readonly kind: 'returned'; readonly text: string }

export type Agent = {
  /** The agent's name as the installer takes it. */
  readonly name: 'claude-code' | 'codex' | 'pi'
  readonly label: string
  /** Why the agent cannot run here, or nothing when it can. */
  readonly unready: () => Promise<string | undefined>
  /** What a person does once, before the first run, such as approving project servers. */
  readonly prepare?: () => Promise<void>
  /** Takes out what the agent kept about a scratch project once it is gone, such as its trust. */
  readonly forget?: (root: string) => Promise<void>
  /**
   * The command that runs one prompt to the end without asking anyone anything, printing
   * every event as JSON: what the model saw and what it did.
   */
  readonly command: (input: { root: string; prompt: string }) => Command
  readonly mocked: Mocked
  /** The agent's last reply, out of the events it printed. */
  readonly reply: (stdout: string) => string
  /** Everything the agent said and every tool it called, in order, out of the events it printed. */
  readonly timeline: (stdout: string) => readonly Moment[]
  /** Where the agent keeps its own record of each session. */
  readonly sessions: string
  /**
   * How the agent's own MCP client introduces itself, so a run can tell it from a client
   * the model wrote for itself.
   */
  readonly client: string
}

/**
 * Claude Code, with your login. The offprompt plugin you may have installed is switched off
 * for the run, so the only offprompt is the project's.
 */
const claudeCode: Agent = {
  name: 'claude-code',
  label: 'Claude Code',
  unready: async () => ((await onPath('claude')) ? undefined : 'no claude on PATH'),
  command: ({ prompt }) => ({
    command: 'claude',
    args: [
      '-p',
      prompt,
      '--output-format',
      'stream-json',
      '--verbose',
      '--allowedTools=mcp__offprompt__collect_secret,mcp__offprompt__await_secret,Bash(node app.mjs)',
      '--settings',
      JSON.stringify({ enabledPlugins: { 'offprompt@offprompt': false } }),
    ],
  }),
  reply: stdout => {
    const result = lastOf(eventsOf(stdout).filter(event => event.type === 'result'))?.result
    return typeof result === 'string' ? result : ''
  },
  timeline: stdout =>
    eventsOf(stdout).flatMap(event => {
      const content = isObject(event.message) ? event.message.content : undefined
      return (isList(content) ? content : []).flatMap((block): Moment[] => {
        if (!isObject(block)) return []
        if (event.type === 'assistant' && block.type === 'text' && typeof block.text === 'string') {
          return [{ kind: 'said', text: block.text }]
        }
        if (event.type === 'assistant' && block.type === 'tool_use' && typeof block.name === 'string') {
          return [{ kind: 'called', name: block.name }]
        }
        if (event.type === 'user' && block.type === 'tool_result') return [{ kind: 'returned', text: textOf(block.content) }]
        return []
      })
    }),
  sessions: join(homedir(), '.claude/projects'),
  client: 'claude-code',
  // Anthropic Messages at ANTHROPIC_BASE_URL, with the project's servers approved as a person would.
  // Its debug log goes with the run, since it says why a server it could not start failed.
  mocked: {
    unready: async () => ((await onPath('claude')) ? undefined : 'no claude on PATH'),
    env: claudeFolders,
    debugLog: CLAUDE_DEBUG_LOG,
    command: ({ prompt, home, model, artifacts }) => ({
      command: 'claude',
      args: [
        '-p',
        prompt,
        '--output-format',
        'stream-json',
        '--verbose',
        `--allowedTools=${MOCKED_TOOLS.join(',')}`,
        '--settings',
        JSON.stringify({ enableAllProjectMcpServers: true }),
        '--debug-file',
        join(artifacts, CLAUDE_DEBUG_LOG),
      ],
      env: { ...claudeFolders(home), ANTHROPIC_BASE_URL: model, ANTHROPIC_API_KEY: 'mock' },
    }),
    sessions: home => join(home, '.claude/projects'),
  },
}

/**
 * Codex saves the trust a run grants on the command line into ~/.codex/config.toml, one
 * table per project. The scratch project's goes once the run is over, and nothing else.
 */
const forgetTrust = async (root: string) => {
  const path = join(homedir(), '.codex/config.toml')
  const text = await readFile(path, 'utf8').catch(() => undefined)
  if (text === undefined) return
  const header = `[projects.${JSON.stringify(root)}]`
  const kept = text.split('\n').reduce<{ readonly skipping: boolean; readonly lines: readonly string[] }>(
    ({ skipping, lines }, line) => {
      if (line.trim() === header) return { skipping: true, lines }
      if (line.trimStart().startsWith('[')) return { skipping: false, lines: [...lines, line] }
      return { skipping, lines: skipping ? lines : [...lines, line] }
    },
    { skipping: false, lines: [] },
  ).lines
  if (kept.length !== text.split('\n').length) await writeFile(path, kept.join('\n'))
}

/**
 * Codex, with your login. It reads a project's config only once the project is trusted,
 * which the run grants on the command line, and the plugin you may have installed is off.
 */
const codex: Agent = {
  name: 'codex',
  label: 'Codex',
  forget: forgetTrust,
  unready: async () => {
    if (!(await onPath('codex'))) return 'no codex on PATH'
    return (await exists(join(homedir(), '.codex/auth.json'))) ? undefined : 'codex is not logged in'
  },
  command: ({ root, prompt }) => ({
    command: 'codex',
    args: [
      'exec',
      '--json',
      '--approve-for-me',
      '--skip-git-repo-check',
      '-C',
      root,
      '-c',
      `projects.${JSON.stringify(root)}.trust_level="trusted"`,
      '-c',
      'plugins."offprompt@offprompt".enabled=false',
      prompt,
    ],
  }),
  reply: stdout => {
    const messages = eventsOf(stdout)
      .map(event => event.item)
      .filter((item): item is Json => isObject(item) && item.type === 'agent_message')
    const text = lastOf(messages)?.text
    return typeof text === 'string' ? text : ''
  },
  // Codex reports each item once it completes: a message, its reasoning, or work such as a
  // command or a tool call together with what came back.
  timeline: stdout =>
    eventsOf(stdout)
      .filter(event => event.type === 'item.completed')
      .flatMap((event): Moment[] => {
        const { item } = event
        if (!isObject(item) || item.type === 'reasoning') return []
        if (item.type === 'agent_message') return [{ kind: 'said', text: typeof item.text === 'string' ? item.text : '' }]
        const name = typeof item.tool === 'string' ? item.tool : typeof item.type === 'string' ? item.type : 'tool'
        return [
          { kind: 'called', name },
          { kind: 'returned', text: JSON.stringify(item.result ?? item.aggregated_output ?? null) },
        ]
      }),
  sessions: join(homedir(), '.codex/sessions'),
  client: 'codex-mcp-client',
  // A provider of the run's own speaking OpenAI Responses, with every approval taken, since the
  // run is a scratch project in a scratch home.
  mocked: {
    unready: async () => ((await onPath('codex')) ? undefined : 'no codex on PATH'),
    env: codexFolders,
    prepare: ({ home }) => mkdir(join(home, '.codex'), { recursive: true }).then(() => undefined),
    command: ({ root, prompt, home, model }) => ({
      command: 'codex',
      args: [
        'exec',
        '--json',
        '--skip-git-repo-check',
        '--dangerously-bypass-approvals-and-sandbox',
        '-C',
        root,
        '-c',
        `projects.${JSON.stringify(root)}.trust_level="trusted"`,
        '-c',
        'model_provider="mock"',
        '-c',
        'model="mock-model"',
        '-c',
        `model_providers.mock={ name = "mock", base_url = "${model}/v1", wire_api = "responses", env_key = "MOCK_API_KEY" }`,
        prompt,
      ],
      // Its warnings about MCP servers go to stderr, which say why a server it could not start failed.
      env: { ...codexFolders(home), MOCK_API_KEY: 'mock', RUST_LOG: 'codex_mcp=warn' },
    }),
    sessions: home => join(home, '.codex/sessions'),
  },
}

/**
 * pi-mcp-adapter starts a server a project declares only once a person approves it, in an
 * interactive session or once for all projects. These runs have no session to approve it
 * in, so Pi's folder for them says so once, as a person would.
 */
const approveProjectServers = async () => {
  const path = join(PI_HOME, 'mcp-adapter.json')
  const current: unknown = JSON.parse(await readFile(path, 'utf8').catch(() => '{}'))
  const config = typeof current === 'object' && current !== null ? current : {}
  const settings = 'settings' in config && typeof config.settings === 'object' ? config.settings : {}
  await mkdir(PI_HOME, { recursive: true })
  await writeFile(path, `${JSON.stringify({ ...config, settings: { ...settings, projectServers: 'allow' } }, null, 2)}\n`)
}

/** Pi, through npx, trusting the project for the run so it reads `.pi/`. */
const pi: Agent = {
  name: 'pi',
  label: 'Pi',
  prepare: approveProjectServers,
  unready: async () =>
    (await piLoggedIn()) ? undefined : `Pi is not logged in; run PI_CODING_AGENT_DIR=${PI_HOME} npx ${PI} and /login once`,
  command: ({ prompt }) => ({
    command: 'npx',
    args: ['-y', PI, '--mode', 'json', '--approve', prompt],
    env: { PI_CODING_AGENT_DIR: PI_HOME },
  }),
  reply: stdout => {
    const replies = eventsOf(stdout)
      .filter(event => event.type === 'message_end')
      .map(event => event.message)
      .filter((message): message is Json => isObject(message) && message.role === 'assistant')
    const content = lastOf(replies)?.content
    return isList(content)
      ? content.map(block => (isObject(block) && typeof block.text === 'string' ? block.text : '')).join('')
      : ''
  },
  timeline: stdout =>
    eventsOf(stdout)
      .filter(event => event.type === 'message_end')
      .flatMap((event): Moment[] => {
        const { message } = event
        if (!isObject(message)) return []
        if (message.role === 'toolResult') return [{ kind: 'returned', text: textOf(message.content) }]
        if (message.role !== 'assistant' || !isList(message.content)) return []
        return message.content.flatMap((block): Moment[] => {
          if (!isObject(block)) return []
          if (block.type === 'text' && typeof block.text === 'string') return [{ kind: 'said', text: block.text }]
          if (block.type === 'toolCall' && typeof block.name === 'string') return [{ kind: 'called', name: block.name }]
          return []
        })
      }),
  sessions: join(PI_HOME, 'sessions'),
  // pi-mcp-adapter introduces itself per server, as pi-mcp-<server>.
  client: 'pi-mcp-',
  // A provider in models.json speaking OpenAI Chat Completions, and the project's servers allowed.
  mocked: {
    unready: async () => ((await onPath('npx')) ? undefined : 'no npx on PATH'),
    env: piFolders,
    prepare: async ({ home, model }) => {
      const folder = join(home, 'pi')
      await mkdir(folder, { recursive: true })
      const provider = { baseUrl: `${model}/v1`, api: 'openai-completions', apiKey: 'mock', models: [{ id: 'mock-model' }] }
      await writeFile(join(folder, 'models.json'), JSON.stringify({ providers: { mock: provider } }))
      await writeFile(join(folder, 'mcp-adapter.json'), JSON.stringify({ settings: { projectServers: 'allow' } }))
    },
    command: ({ prompt, home }) => ({
      command: 'npx',
      args: ['-y', PI, '--mode', 'json', '--approve', '--provider', 'mock', '--model', 'mock-model', prompt],
      env: piFolders(home),
    }),
    sessions: home => join(home, 'pi/sessions'),
  },
}

export const AGENTS: readonly Agent[] = [claudeCode, codex, pi]
