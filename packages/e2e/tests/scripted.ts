import { AGENTS } from '../src/agents.js'
import type { Call } from '../src/model.js'

/**
 * The agents a test file runs, each with why it cannot run here, if it cannot: those named, or
 * those E2E_AGENTS=codex,pi names, or all.
 */
export const mockedAgents = (chosen = process.env.E2E_AGENTS?.split(',') ?? AGENTS.map(agent => agent.name)) =>
  Promise.all(
    AGENTS.filter(agent => chosen.includes(agent.name)).map(async agent => ({ agent, unready: await agent.mocked.unready() })),
  )

/** The model's script is what matters; the prompt only has to be something a person might type. */
export const PROMPT = 'Set up the secret this project needs.'

/** A person's own machine: on Linux one with a display, which CI's runners lack. */
export const DESKTOP: Readonly<Record<string, string>> = process.platform === 'linux' ? { DISPLAY: process.env.DISPLAY ?? ':0' } : {}

/** A machine the person reaches over SSH, which offprompt takes for one whose screen they cannot see. */
export const REMOTE = { SSH_CONNECTION: '192.0.2.1 50000 192.0.2.2 22' }

export const generated: Call = {
  tool: 'collect_secret',
  arguments: { secrets: [{ name: 'SESSION_SECRET', generate: {} }], reason: 'Signs session cookies.', sink: { kind: 'dotenv', path: '.env' } },
}

export const typed: Call = {
  tool: 'collect_secret',
  arguments: {
    secrets: [{ name: 'RESEND_API_KEY', provider: 'resend' }],
    reason: 'Sends transactional email.',
    sink: { kind: 'dotenv', path: '.env' },
  },
}

/** Waits on the request the last result named. */
export const awaited: Call = {
  tool: 'await_secret',
  arguments: results => ({ request_id: /"request_id":\s*"([^"]+)"/.exec(results.at(-1) ?? '')?.[1] ?? '' }),
}
