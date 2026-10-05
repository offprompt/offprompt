import { stat } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, join, parse, resolve } from 'node:path'
import { parseArgs } from 'node:util'

import { removeBundle, vendorBundle } from './bundle.js'
import { exists } from './files.js'
import { packaged, repository } from './origin.js'
import { removeSettled, settled, settlePlugin } from './plugin.js'
import { serve } from './serve.js'
import { globalServer, projectServer } from './server.js'
import { BUNDLE, LAUNCHER, type Project, type Target } from './target.js'
import { TARGETS } from './targets.js'

const USAGE = `usage: offprompt [init | remove | list] [--agent <name>]... [--project <dir>]
       offprompt [init | remove] -g [--agent <name>]...
       offprompt mcp

  init      puts offprompt into the project for the agents found on this machine, or those
            named; add does the same
  remove    takes it out of the project, or with -g out of every agent that has it
  list      shows every agent, whether it was found, and how offprompt reaches it
  mcp       runs the server on stdio in this directory, for an MCP client that starts it
            as npx -y offprompt mcp

  --agent <name>   only this agent, by its name in 'list'; repeat it for several
  --project <dir>  the project, by default the directory the command runs in
  -g, --global     for you, in every project, instead of for one project, from a copy of
                   this package in ~/.local/share/offprompt
  --from <dir>     with -g, for development: the directory 'pnpm package' made, used as it is
  -h, --help       this
`

const COMMANDS = ['init', 'remove', 'list', 'mcp'] as const

type Command = (typeof COMMANDS)[number]

/** The command a word asks for. add is init's earlier name, kept for the scripts that use it. */
const commandFor = (word: string): Command | undefined =>
  word === 'add' ? 'init' : COMMANDS.find(command => command === word)

const refuse = (message: string): never => {
  process.stderr.write(`offprompt: ${message}\n`)
  process.exit(1)
}

const parsed = (() => {
  try {
    return parseArgs({
      options: {
        agent: { type: 'string', multiple: true, default: [] },
        project: { type: 'string' },
        global: { type: 'boolean', short: 'g', default: false },
        from: { type: 'string' },
        help: { type: 'boolean', short: 'h', default: false },
      },
      allowPositionals: true,
    })
  } catch (error: unknown) {
    return refuse(`${error instanceof Error ? error.message : String(error)}\n\n${USAGE}`)
  }
})()

/** Where the command was typed: pnpm runs `pnpm agents` from this package and says where in INIT_CWD, as npx does. */
const here = process.env.INIT_CWD ?? process.cwd()

type ProjectTarget = Target & { readonly project: Project }

const inProjects = (target: Target): target is ProjectTarget => target.project !== undefined

const say = (label: string, outcome: string) => process.stdout.write(`✓ ${label}: ${outcome}\n`)

const failed = (label: string, error: unknown) => {
  process.stdout.write(`✗ ${label}: ${error instanceof Error ? error.message : String(error)}\n`)
  return false
}

/**
 * One agent at a time, so the report reads in order and no two write one file at once. An
 * outcome of nothing means there was nothing to do, and is not reported.
 */
const applyAll = <Each extends Target>(targets: readonly Each[], apply: (target: Each) => Promise<string | undefined>) =>
  targets.reduce<Promise<readonly boolean[]>>(async (done, target) => {
    const outcomes = await done
    const succeeded = await apply(target).then(
      outcome => {
        if (outcome !== undefined) say(target.label, outcome)
        return true
      },
      (error: unknown) => failed(target.label, error),
    )
    return [...outcomes, succeeded]
  }, Promise.resolve([]))

const listing = (found: readonly boolean[]) =>
  [
    `${'agent'.padEnd(20)}${'name'.padEnd(24)}${'found'.padEnd(7)}${'in a project'.padEnd(22)}with -g\n`,
    ...TARGETS.map(
      (target, index) =>
        `${target.agent.padEnd(20)}${target.label.padEnd(24)}${(found[index] === true ? 'yes' : '-').padEnd(7)}${(target.project?.file ?? '-').padEnd(22)}${target.global.method}\n`,
    ),
  ].join('')

/** The agents named with --agent, or else those found on this machine. */
const chosen = async ({ named, found }: { named: readonly string[]; found: () => Promise<readonly boolean[]> }) => {
  if (named.length > 0) return TARGETS.filter(target => named.includes(target.agent))
  const detected = await found()
  return TARGETS.filter((_, index) => detected[index] === true)
}

/** A directory someone works in: not the home directory, the filesystem root or this checkout. */
const projectAt = async (path: string) => {
  const root = resolve(here, path)
  const directory = await stat(root).then(
    stats => stats.isDirectory(),
    () => false,
  )
  if (!directory) refuse(`${root} is not a directory`)
  if (root === homedir() || root === parse(root).root) refuse(`${root} is not a project; run this in one, or pass --project`)
  if (root === (await repository())) refuse('this is the offprompt repository itself; pass --project with your project')
  return root
}

/**
 * An agent named with --agent that offprompt cannot reach in a project fails the run; one
 * that was only found on this machine is noted.
 */
const addToProject = async ({ root, targets, named }: { root: string; targets: readonly Target[]; named: boolean }) => {
  const elsewhere = targets.filter(target => !inProjects(target))
  const notes = elsewhere.map(target => `- ${target.label}: no project config yet; -g --agent ${target.agent} adds it for you\n`)
  process.stdout.write(notes.join(''))
  const writable = targets.filter(inProjects)
  if (writable.length === 0) return [!named]
  say('offprompt', `bundle in ${await vendorBundle(root)}/`)
  const added = await applyAll(writable, target => target.project.install(root, projectServer))
  process.stdout.write(`\nCommit ${dirname(BUNDLE)}/ and the files above, so everyone on the project gets offprompt.\n`)
  return [...added, !(named && elsewhere.length > 0)]
}

const removeFromProject = async ({ root, targets, named }: { root: string; targets: readonly Target[]; named: boolean }) => {
  const removed = await applyAll(targets.filter(inProjects), target => target.project.remove(root))
  // Named agents take out only their own entries; the bundle goes with the last of them.
  if (!named && (await removeBundle(root))) say('offprompt', `removed ${dirname(BUNDLE)}/`)
  return removed
}

/**
 * The plugin -g installs from: the directory --from names, as `pnpm package` made it, or else
 * ~/.local/share/offprompt, where a CLI run from its package first copies that package.
 */
const pluginFrom = async (from: string | undefined) => {
  if (from !== undefined) return resolve(here, from)
  const plugin = settled()
  if (!(await packaged())) return plugin
  const outcome = await settlePlugin(plugin).catch((error: unknown) =>
    refuse(error instanceof Error ? error.message : String(error)),
  )
  if (outcome !== undefined) say('offprompt', outcome)
  return plugin
}

/**
 * Takes offprompt out of every agent that has it, or of those named. With none named, the
 * plugin -g settled goes too, as the bundle goes from a project, since no agent is left on it.
 */
const removeForYou = async ({ targets, named }: { targets: readonly Target[]; named: boolean }) => {
  const removed = await applyAll(targets, target => target.global.remove())
  if (!named && (await removeSettled(settled()))) say('offprompt', `removed ${settled()}`)
  return removed
}

const main = async () => {
  const { values, positionals } = parsed
  if (values.help) {
    process.stdout.write(USAGE)
    return
  }
  const [word = 'init', ...extra] = positionals
  const command = commandFor(word)
  if (command === undefined || extra.length > 0) return refuse(`unexpected ${[word, ...extra].join(' ')}\n\n${USAGE}`)
  // Before anything else is said: from here on, stdout is the client's.
  if (command === 'mcp') {
    const code = await serve().catch((error: unknown) => refuse(error instanceof Error ? error.message : String(error)))
    return process.exit(code)
  }

  const known = new Set(TARGETS.map(target => target.agent))
  const unknown = values.agent.filter(agent => !known.has(agent))
  if (unknown.length > 0) refuse(`no agent called ${unknown.join(', ')}; 'list' shows them all`)

  const found = () => Promise.all(TARGETS.map(target => target.detect()))
  if (command === 'list') {
    process.stdout.write(listing(await found()))
    return
  }

  const named = values.agent.length > 0
  // Removing looks everywhere offprompt could be, whether or not the agent is still installed.
  const targets = command === 'remove' && !named ? TARGETS : await chosen({ named: values.agent, found })
  if (targets.length === 0) refuse("found no agent on this machine; name one with --agent, and 'list' shows them all")

  const outcomes = await (async () => {
    if (!values.global) {
      const root = await projectAt(values.project ?? '.')
      return command === 'init' ? addToProject({ root, targets, named }) : removeFromProject({ root, targets, named })
    }
    if (command === 'remove') return removeForYou({ targets, named })
    const plugin = await pluginFrom(values.from)
    const server = globalServer(plugin)
    if (!(await exists(join(plugin, LAUNCHER)))) refuse(`${plugin} holds no packaged offprompt; run 'pnpm package ${plugin}' first`)
    return applyAll(targets, target => target.global.install({ plugin, server }))
  })()
  if (outcomes.includes(false)) process.exitCode = 1
}

await main()
