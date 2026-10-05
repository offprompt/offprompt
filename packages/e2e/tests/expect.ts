import { expect } from 'vitest'

import type { runScenario } from '../src/scenario.js'

type Run = Awaited<ReturnType<typeof runScenario>>

/** A key's value in a dotenv file, as it stands on its line. */
export const valueIn = (dotenv: string, name: string) => new RegExp(`^${name}=(.*)$`, 'm').exec(dotenv)?.[1]

/**
 * offprompt was reached the way a user's agent reaches it: its own MCP client called
 * collect_secret, and no other client, such as one the model wrote for itself, started it.
 */
export const expectReachedByTheAgent = (run: Run, client: string) => {
  expect(run.traffic.clients.length, 'offprompt was started').toBeGreaterThan(0)
  run.traffic.clients.forEach(name => expect(name, 'the client that started offprompt').toMatch(new RegExp(`^${client}`)))
  expect(run.traffic.results.map(result => result.name)).toContain('collect_secret')
}
