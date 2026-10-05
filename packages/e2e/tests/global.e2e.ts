import { isAbsolute, relative } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

import { leaksOf } from '../src/leaks.js'
import { runScenario } from '../src/scenario.js'
import { expectReachedByTheAgent, valueIn } from './expect.js'
import { DESKTOP, generated, mockedAgents, PROMPT } from './scripted.js'

/**
 * The real Claude Code, Codex and Pi, each against the scripted model, with offprompt installed
 * for the agent itself rather than into the project: `npx offprompt init -g` from the npm
 * package as it is packed for publishing, in a home of the agent's own. The agent then works
 * in a project that holds no offprompt and no config for it, and reaches offprompt through the
 * plugin the install registered, started by its launcher.
 */

const teardowns: (() => Promise<void>)[] = []

afterEach(async () => {
  // E2E_KEEP=1 leaves the scratch projects and homes in place for a look.
  const cleanups = teardowns.splice(0)
  if (process.env.E2E_KEEP !== '1') await Promise.all(cleanups.map(cleanup => cleanup()))
})

const agents = await mockedAgents()

/** Whether `path` lies inside `folder`. */
const isInside = ({ path, folder }: { path: string; folder: string }) => {
  const rest = relative(folder, path)
  return rest !== '' && !rest.startsWith('..') && !isAbsolute(rest)
}

describe.each(agents)('$agent.label with offprompt installed for it, against a scripted model', ({ agent, unready }) => {
  it.skipIf(unready !== undefined)(
    `writes a generated value into the project through the plugin init -g installed${unready ? ` (${unready})` : ''}`,
    async () => {
      const run = await runScenario({
        agent,
        scenario: 'global-generated',
        prompt: PROMPT,
        model: [generated],
        environment: DESKTOP,
        install: 'global',
      })
      teardowns.push(run.cleanup)
      console.log(JSON.stringify(run.summary, null, 2))

      expectReachedByTheAgent(run, agent.client)
      // The agent started the plugin's copy in its own home, wherever it keeps it.
      const server = run.traffic.server ?? ''
      expect(isInside({ path: server, folder: run.home ?? '' }), `offprompt started from ${server}`).toBe(true)
      const value = valueIn(await run.project.read('.env'), 'SESSION_SECRET') ?? ''
      expect(value).toMatch(/^\S{43}$/)
      expect(run.modelSaw.join('\n'), 'the model was told the write landed').toContain('written')
      // The value is in .env and nowhere else, the model's side of the conversation included.
      expect(await leaksOf({ value, places: run.places })).toEqual([])
    },
  )
})
