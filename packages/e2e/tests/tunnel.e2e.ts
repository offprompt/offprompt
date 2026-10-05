import { randomBytes } from 'node:crypto'
import { afterEach, describe, expect, it } from 'vitest'

import { leaksOf } from '../src/leaks.js'
import { runScenario } from '../src/scenario.js'
import { field } from '../src/traffic.js'
import { expectReachedByTheAgent, valueIn } from './expect.js'
import { awaited, mockedAgents, PROMPT, REMOTE, typed } from './scripted.js'

/**
 * A page that crosses the internet. Claude Code, against the scripted model, runs on a machine
 * the person reaches over SSH, and offprompt exposes the page through a real Cloudflare quick
 * tunnel, with the cloudflared it downloads, as it would from a cloud sandbox. The run fills
 * the page at its https address on trycloudflare.com. It needs the network and Cloudflare's
 * free service, so it runs only when E2E_TUNNEL=1 asks for it.
 */

const teardowns: (() => Promise<void>)[] = []

afterEach(async () => {
  // E2E_KEEP=1 leaves the scratch projects in place for a look.
  const cleanups = teardowns.splice(0)
  if (process.env.E2E_KEEP !== '1') await Promise.all(cleanups.map(cleanup => cleanup()))
})

const OPTED_IN = process.env.E2E_TUNNEL === '1'

/** A quick tunnel's page, sealed to the key after its `#`, which no tunnel receives. */
const TUNNEL_PAGE = /^https:\/\/[a-z0-9-]+\.trycloudflare\.com\/r\/[0-9a-f]+#k=[\w-]+$/

const agents = await mockedAgents(['claude-code'])

describe.each(agents)('$agent.label against a scripted model, through a Cloudflare quick tunnel', ({ agent, unready }) => {
  const skipped = OPTED_IN ? unready : 'E2E_TUNNEL=1 runs it'

  it.skipIf(skipped !== undefined)(
    `hands the model a page on trycloudflare.com from a remote machine, and the value crosses it${skipped ? ` (${skipped})` : ''}`,
    async () => {
      const value = `re_${randomBytes(15).toString('hex')}`
      const run = await runScenario({
        agent,
        scenario: 'mock-tunnel',
        prompt: PROMPT,
        model: [typed, awaited],
        values: { RESEND_API_KEY: value },
        environment: REMOTE,
        tunnel: true,
      })
      teardowns.push(run.cleanup)
      console.log(JSON.stringify(run.summary, null, 2))

      expectReachedByTheAgent(run, agent.client)
      expect(run.inBrowser, 'no browser opened on a screen the person cannot see').toBe(false)
      // The page loaded at the tunnel's https address, and took the value: it shows its
      // fingerprint only once the write landed.
      expect(run.page, 'the page came through the tunnel, sealed to a key in its link').toMatch(TUNNEL_PAGE)
      expect(run.pageEmoji, 'the page said the value was written').toBeDefined()
      expect(valueIn(await run.project.read('.env'), 'RESEND_API_KEY')).toBe(value)
      expect(await leaksOf({ value, places: run.places })).toEqual([])

      expect(run.traffic.results.map(result => [result.name, field(result.payload, 'status')])).toEqual([
        ['collect_secret', 'awaiting'],
        ['await_secret', 'written'],
      ])
      expect(run.modelSaw[0], 'the model was given the link').toContain(run.page)
      expect(run.modelSaw.join('\n'), 'the model was told the fingerprint').toContain(`Fingerprint ${run.pageEmoji ?? ''}`)
    },
  )
})
