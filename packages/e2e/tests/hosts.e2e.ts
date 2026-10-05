import { randomBytes } from 'node:crypto'
import { afterEach, describe, expect, it } from 'vitest'

import { leaksOf } from '../src/leaks.js'
import { runScenario } from '../src/scenario.js'
import { field } from '../src/traffic.js'
import { expectReachedByTheAgent, valueIn } from './expect.js'
import { awaited, DESKTOP, generated, mockedAgents, PROMPT, REMOTE, typed } from './scripted.js'

/**
 * The real Claude Code, Codex and Pi, each against a scripted model instead of its provider's:
 * the host loads offprompt from the project, starts it, and passes the model's calls and
 * offprompt's results through, which is the part that differs from host to host. No account
 * is needed, so this runs anywhere the CLIs do, CI included.
 */

const teardowns: (() => Promise<void>)[] = []

afterEach(async () => {
  // E2E_KEEP=1 leaves the scratch projects in place for a look.
  const cleanups = teardowns.splice(0)
  if (process.env.E2E_KEEP !== '1') await Promise.all(cleanups.map(cleanup => cleanup()))
})

const agents = await mockedAgents()

describe.each(agents)('$agent.label against a scripted model', ({ agent, unready }) => {
  it.skipIf(unready !== undefined)(`writes a generated value into the project${unready ? ` (${unready})` : ''}`, async () => {
    const run = await runScenario({ agent, scenario: 'mock-generated', prompt: PROMPT, model: [generated], environment: DESKTOP })
    teardowns.push(run.cleanup)
    console.log(JSON.stringify(run.summary, null, 2))

    expectReachedByTheAgent(run, agent.client)
    const value = valueIn(await run.project.read('.env'), 'SESSION_SECRET') ?? ''
    expect(value).toMatch(/^\S{43}$/)
    expect(run.modelSaw.join('\n'), 'the model was told the write landed').toContain('written')
    // The value is in .env and nowhere else, the model's side of the conversation included.
    expect(await leaksOf({ value, places: run.places })).toEqual([])
  })

  it.skipIf(unready !== undefined)(
    `asks on the page and tells the model the fingerprint the page shows${unready ? ` (${unready})` : ''}`,
    async () => {
      const value = `re_${randomBytes(15).toString('hex')}`
      const run = await runScenario({
        agent,
        scenario: 'mock-typed',
        prompt: PROMPT,
        model: [typed],
        values: { RESEND_API_KEY: value },
        environment: DESKTOP,
      })
      teardowns.push(run.cleanup)
      console.log(JSON.stringify(run.summary, null, 2))

      expectReachedByTheAgent(run, agent.client)
      expect(run.inBrowser, 'offprompt opened the page in the browser').toBe(true)
      expect(valueIn(await run.project.read('.env'), 'RESEND_API_KEY')).toBe(value)
      expect(await leaksOf({ value, places: run.places })).toEqual([])

      // What the host passed back to the model carries the line to say, with the four the page
      // showed: the part each host passes differently, structured content or text.
      const written = run.traffic.results.find(result => field(result.payload, 'status') === 'written')
      expect(field(written?.payload, 'emoji')).toBe(run.pageEmoji)
      expect(run.modelSaw.join('\n'), 'the model was told the fingerprint').toContain(`Fingerprint ${run.pageEmoji ?? ''}`)
      expect(run.reply, 'the host showed what the model said').toContain(run.pageEmoji)
    },
  )

  it.skipIf(unready !== undefined)(
    `hands the model a sealed page's link from a remote machine, and waits${unready ? ` (${unready})` : ''}`,
    async () => {
      const value = `re_${randomBytes(15).toString('hex')}`
      const run = await runScenario({
        agent,
        scenario: 'mock-remote',
        prompt: PROMPT,
        model: [typed, awaited],
        values: { RESEND_API_KEY: value },
        environment: REMOTE,
      })
      teardowns.push(run.cleanup)
      console.log(JSON.stringify(run.summary, null, 2))

      expectReachedByTheAgent(run, agent.client)
      expect(run.inBrowser, 'no browser opened on a screen the person cannot see').toBe(false)
      expect(run.page, 'the page is sealed to a key in its link').toMatch(/#k=/)
      expect(valueIn(await run.project.read('.env'), 'RESEND_API_KEY')).toBe(value)
      expect(await leaksOf({ value, places: run.places })).toEqual([])

      // collect_secret came back waiting, with the link for the model to show, and
      // await_secret came back once the page was written, with the line to say.
      expect(run.traffic.results.map(result => [result.name, field(result.payload, 'status')])).toEqual([
        ['collect_secret', 'awaiting'],
        ['await_secret', 'written'],
      ])
      expect(run.modelSaw[0], 'the model was given the link').toContain(run.page)
      expect(run.modelSaw.join('\n'), 'the model was told the fingerprint').toContain(`Fingerprint ${run.pageEmoji ?? ''}`)
      expect(run.reply, 'the host showed what the model said').toContain(run.pageEmoji)
    },
  )
})
