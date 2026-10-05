import { randomBytes } from 'node:crypto'
import { afterEach, describe, expect, it } from 'vitest'

import { AGENTS } from '../src/agents.js'
import { leaksOf } from '../src/leaks.js'
import { runScenario } from '../src/scenario.js'
import { field } from '../src/traffic.js'
import { expectReachedByTheAgent, valueIn } from './expect.js'

type Teardown = () => Promise<void>

const teardowns: Teardown[] = []

afterEach(async () => {
  // E2E_KEEP=1 leaves the scratch projects in place for a look.
  const cleanups = teardowns.splice(0)
  if (process.env.E2E_KEEP !== '1') await Promise.all(cleanups.map(cleanup => cleanup()))
})

/** E2E_AGENTS=codex,pi runs only those. */
const chosen = process.env.E2E_AGENTS?.split(',') ?? AGENTS.map(agent => agent.name)

const agents = await Promise.all(
  AGENTS.filter(agent => chosen.includes(agent.name)).map(async agent => ({ agent, unready: await agent.unready() })),
)

const GENERATED_PROMPT = `Use offprompt's collect_secret tool to generate a random SESSION_SECRET into the dotenv file .env (pass generate: {} for it). The reason is "signs session cookies". Do not open or read .env. Reply with the status the tool returned.`

const TYPED_PROMPT = `Use offprompt's collect_secret tool to ask me for RESEND_API_KEY (provider resend) and write it to the dotenv file .env. The reason is "sends transactional email". I will type it on the page it opens; wait for the tool to return. Do not open or read .env. Reply with the status the tool returned.`

const BACK_TO_BACK_PROMPT = `Use offprompt's collect_secret tool twice, one call straight after the other. First ask me for RESEND_API_KEY (provider resend) and write it to the dotenv file .env. Then ask me for SIGNING_KEY (format pem, secret false) and write it to the file keys/signing.pem. I will type each on the page it opens. Do not open or read either file. Reply with what you did.`

const SIGNING_KEY = '-----BEGIN PUBLIC KEY-----\nMFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEe2e2e2e2e2e2e2e2e2e2e2e2e2e2e2e2\n-----END PUBLIC KEY-----'


describe.each(agents)('$agent.label', ({ agent, unready }) => {
  it.skipIf(unready !== undefined)(`writes a generated value into the project${unready ? ` (${unready})` : ''}`, async () => {
    const run = await runScenario({ agent, scenario: 'generated', prompt: GENERATED_PROMPT })
    teardowns.push(run.cleanup)
    console.log(JSON.stringify(run.summary, null, 2))

    expectReachedByTheAgent(run, agent.client)
    const value = valueIn(await run.project.read('.env'), 'SESSION_SECRET') ?? ''
    expect(value).toMatch(/^\S{43}$/)
    expect(run.sessions.length, 'the agent kept a record of the session').toBeGreaterThan(0)
    // The value is in .env and nowhere else.
    expect(await leaksOf({ value, places: run.places })).toEqual([])
  })

  it.skipIf(unready !== undefined)(`collects a typed value through the page${unready ? ` (${unready})` : ''}`, async () => {
    const typed = `re_${randomBytes(15).toString('hex')}`
    const run = await runScenario({ agent, scenario: 'typed', prompt: TYPED_PROMPT, values: { RESEND_API_KEY: typed } })
    teardowns.push(run.cleanup)
    console.log(JSON.stringify(run.summary, null, 2))

    expectReachedByTheAgent(run, agent.client)
    expect(run.page, 'offprompt offered a page').toBeDefined()
    // Nobody answers an agent's own dialog in these runs, so the page has to reach the browser.
    expect(run.inBrowser, 'offprompt opened the page in the browser').toBe(true)
    expect(valueIn(await run.project.read('.env'), 'RESEND_API_KEY')).toBe(typed)
    expect(run.sessions.length, 'the agent kept a record of the session').toBeGreaterThan(0)
    expect(await leaksOf({ value: typed, places: run.places })).toEqual([])

    // The fingerprint the page showed is the one offprompt took from the file, and the agent
    // says it as soon as the write lands, so the person can compare the two.
    const written = run.traffic.results.find(result => field(result.payload, 'status') === 'written')
    expect(field(written?.payload, 'emoji')).toBe(run.pageEmoji)
    expect(run.saidAfterWrite, 'the agent said the fingerprint before its next tool call').toContain(run.pageEmoji)
  })

  it.skipIf(unready !== undefined)(`says each fingerprint when two writes come back to back${unready ? ` (${unready})` : ''}`, async () => {
    // A dotenv key, then a PEM to a file of its own: the second fingerprint went unsaid once,
    // when an agent took the two writes for one step.
    const typed = `re_${randomBytes(15).toString('hex')}`
    const run = await runScenario({
      agent,
      scenario: 'back-to-back',
      prompt: BACK_TO_BACK_PROMPT,
      values: [{ RESEND_API_KEY: typed }, { SIGNING_KEY }],
    })
    teardowns.push(run.cleanup)
    console.log(JSON.stringify(run.summary, null, 2))

    expectReachedByTheAgent(run, agent.client)
    expect(valueIn(await run.project.read('.env'), 'RESEND_API_KEY')).toBe(typed)
    expect(await run.project.read('keys/signing.pem')).toBe(SIGNING_KEY)
    expect(run.saidAfterWrites, 'a fingerprint for each write').toHaveLength(2)
    run.saidAfterWrites.forEach(({ emoji, said }) =>
      expect(said, `the agent said ${emoji} before its next tool call`).toContain(emoji),
    )
    expect(run.pageEmojis).toEqual(run.saidAfterWrites.map(({ emoji }) => emoji))
  })

  it.skipIf(unready !== undefined)(`reaches for offprompt unprompted${unready ? ` (${unready})` : ''}`, async () => {
    // Nothing names offprompt: a project whose README asks for a key, and the one request.
    const typed = `re_${randomBytes(15).toString('hex')}`
    const run = await runScenario({
      agent,
      scenario: 'unprompted',
      prompt: 'Get the app running.',
      from: 'mailer',
      values: { RESEND_API_KEY: typed },
    })
    teardowns.push(run.cleanup)
    console.log(JSON.stringify(run.summary, null, 2))

    expectReachedByTheAgent(run, agent.client)
    expect(run.page, 'offprompt offered a page').toBeDefined()
    // Nobody answers an agent's own dialog in these runs, so the page has to reach the browser.
    expect(run.inBrowser, 'offprompt opened the page in the browser').toBe(true)
    expect(valueIn(await run.project.read('.env'), 'RESEND_API_KEY')).toBe(typed)
    expect(await leaksOf({ value: typed, places: run.places })).toEqual([])

    // The task goes on after the write, since the app still has to start, and the fingerprint
    // does not wait for the end of it.
    expect(run.saidAfterWrite, 'the agent said the fingerprint before its next tool call').toContain(run.pageEmoji)
  })
})
