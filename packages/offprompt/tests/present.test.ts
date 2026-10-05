import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { delimiter, join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { ResolvedSink } from '../src/core/sinks.js'
import { createRequestStore, type TypedValue } from '../src/core/store.js'
import { createPresenter, openerFor } from '../src/mcp/present.js'

const PLAIN: TypedValue = { kind: 'typed', rules: [], multiline: false, masked: true, offers: [] }

const sink: ResolvedSink = {
  kind: 'dotenv',
  absolutePath: '/tmp/project/.env',
  relativePath: '.env',
  tracked: false,
  ignored: true,
  exists: true,
}

const URL_UNDER_TEST = 'http://127.0.0.1:54321/r/abc'

const LOOPBACK = { origin: 'http://127.0.0.1:54321', port: 54321 }

const TUNNEL = 'https://some-words.trycloudflare.com'

const REMOTE = { path: '/r/abc', publicKey: 'PUBLICKEY' }

const setupTest = ({
  elicitationUrl = false,
  elicitationAnswer = new Promise<never>(() => undefined),
  browserOpens = true,
  tunnel = undefined,
}: {
  elicitationUrl?: boolean
  elicitationAnswer?: Promise<unknown>
  browserOpens?: boolean
  tunnel?: string | undefined
} = {}) => {
  const store = createRequestStore()
  const request = store.create({
    secrets: [{ name: 'TOKEN', value: PLAIN, overwrites: false }],
    reason: 'needed',
    sink,
  })

  const elicitInput = vi.fn(() => elicitationAnswer)
  const openUrl = vi.fn(() => Promise.resolve(browserOpens))
  const tunnelUrl = vi.fn(() => Promise.resolve(tunnel))

  const present = createPresenter({
    server: {
      getClientCapabilities: () => (elicitationUrl ? { elicitation: { url: {} } } : {}),
      elicitInput,
    },
    loopback: LOOPBACK,
    tunnelUrl,
    openUrl,
    settleMs: 10,
  })

  return { present, request, url: URL_UNDER_TEST, elicitInput, openUrl, tunnelUrl }
}

describe('openerFor', () => {
  it('uses the platform handler on each platform it supports', () => {
    expect(openerFor('darwin')).toEqual(['open'])
    expect(openerFor('linux')).toEqual(['xdg-open'])
    expect(openerFor('win32')).toEqual(['rundll32', 'url.dll,FileProtocolHandler'])
  })

  it('has no opener for a platform it does not know', () => {
    expect(openerFor('aix')).toBeUndefined()
  })
})

describe('the presentation ladder', () => {
  it('offers the URL through the host when the client advertises url elicitation', async () => {
    const { present, request, url, elicitInput, openUrl } = setupTest({ elicitationUrl: true })

    const presentation = await present({ request, url })

    expect(presentation).toEqual({ channel: 'elicitation' })
    expect(elicitInput).toHaveBeenCalledWith(
      expect.objectContaining({ mode: 'url', url, elicitationId: request.id }),
    )
    expect(openUrl).not.toHaveBeenCalled()
  })

  it('opens the browser itself when the client does not advertise url elicitation', async () => {
    const { present, request, url, elicitInput, openUrl } = setupTest()

    const presentation = await present({ request, url })

    expect(presentation).toEqual({ channel: 'browser' })
    expect(elicitInput).not.toHaveBeenCalled()
    expect(openUrl).toHaveBeenCalledWith(url)
  })

  it('falls through to the browser when the host refuses the elicitation', async () => {
    const { present, request, url, openUrl } = setupTest({
      elicitationUrl: true,
      elicitationAnswer: Promise.reject(new Error('not supported')),
    })

    const presentation = await present({ request, url })

    expect(presentation).toEqual({ channel: 'browser' })
    expect(openUrl).toHaveBeenCalledWith(url)
  })

  it('falls through to the browser when the host cancels or declines the dialog, as codex exec cancels', async () => {
    const answers = [{ action: 'cancel' }, { action: 'decline' }]
    const presentations = await Promise.all(
      answers.map(async answer => {
        const { present, request, url, openUrl } = setupTest({ elicitationUrl: true, elicitationAnswer: Promise.resolve(answer) })
        const presentation = await present({ request, url })
        expect(openUrl).toHaveBeenCalledWith(url)
        return presentation
      }),
    )

    expect(presentations).toEqual([{ channel: 'browser' }, { channel: 'browser' }])
  })

  it('keeps to the dialog when the person accepts it', async () => {
    const { present, request, url, openUrl } = setupTest({
      elicitationUrl: true,
      elicitationAnswer: Promise.resolve({ action: 'accept' }),
    })

    expect(await present({ request, url })).toEqual({ channel: 'elicitation' })
    expect(openUrl).not.toHaveBeenCalled()
  })

  it('returns the URL in the result when the browser cannot be opened', async () => {
    const { present, request, url } = setupTest({ browserOpens: false })

    const presentation = await present({ request, url })

    expect(presentation).toEqual({
      channel: 'result',
      url,
      reason: 'the browser could not be opened on this machine',
    })
  })

  it('starts no tunnel for a request made on the human\'s own machine', async () => {
    const { present, request, url, tunnelUrl } = setupTest()
    await present({ request, url })
    expect(tunnelUrl).not.toHaveBeenCalled()
  })
})

describe('the presentation ladder, from a sandbox', () => {
  it('puts the tunnel link in the result, with the key after the #', async () => {
    const { present, request, url, openUrl } = setupTest({ tunnel: TUNNEL })

    const presentation = await present({ request, url, remote: REMOTE })

    expect(presentation).toEqual({
      channel: 'remote',
      url: `${TUNNEL}/r/abc#k=PUBLICKEY`,
      via: 'tunnel',
      port: 54321,
      shownByHost: false,
    })
    expect(openUrl).not.toHaveBeenCalled()
  })

  it('hands out the loopback link when no tunnel comes up', async () => {
    const { present, request, url, openUrl } = setupTest()

    const presentation = await present({ request, url, remote: REMOTE })

    expect(presentation).toEqual({
      channel: 'remote',
      url: 'http://127.0.0.1:54321/r/abc#k=PUBLICKEY',
      via: 'loopback',
      port: 54321,
      shownByHost: false,
    })
    expect(openUrl).not.toHaveBeenCalled()
  })

  it('gives the link to the host dialog when the client takes url elicitation', async () => {
    const { present, request, url, elicitInput, openUrl } = setupTest({ elicitationUrl: true, tunnel: TUNNEL })

    const presentation = await present({ request, url, remote: REMOTE })

    expect(presentation).toMatchObject({ channel: 'remote', via: 'tunnel', shownByHost: true })
    expect(elicitInput).toHaveBeenCalledWith(expect.objectContaining({ url: `${TUNNEL}/r/abc#k=PUBLICKEY` }))
    expect(openUrl).not.toHaveBeenCalled()
  })

  it('puts the link in the result when the host cancels the dialog', async () => {
    const { present, request, url } = setupTest({
      elicitationUrl: true,
      tunnel: TUNNEL,
      elicitationAnswer: Promise.resolve({ action: 'cancel' }),
    })

    expect(await present({ request, url, remote: REMOTE })).toMatchObject({ channel: 'remote', shownByHost: false })
  })

  it('never runs the platform opener, even when the host refuses the elicitation', async () => {
    const { present, request, url, openUrl } = setupTest({
      elicitationUrl: true,
      elicitationAnswer: Promise.reject(new Error('not supported')),
      tunnel: TUNNEL,
    })

    const presentation = await present({ request, url, remote: REMOTE })

    expect(presentation).toMatchObject({ channel: 'remote', shownByHost: false })
    expect(openUrl).not.toHaveBeenCalled()
  })
})

/**
 * The platform's own opener, as the presenter runs it when nothing stands in for it: a
 * program by that name first on PATH, which writes down what it was given and exits as told.
 * Windows opens pages through rundll32, which PATH does not reach, so this runs elsewhere.
 */
describe.skipIf(process.platform === 'win32')("the platform's opener", () => {
  const folders: string[] = []

  afterEach(async () => {
    vi.unstubAllEnvs()
    await Promise.all(folders.splice(0).map(folder => rm(folder, { recursive: true, force: true })))
  })

  const setupOpener = async ({ exit }: { exit: number }) => {
    const folder = await mkdtemp(join(tmpdir(), 'offprompt-opener-'))
    folders.push(folder)
    const given = join(folder, 'given.txt')
    const [command] = openerFor(process.platform) ?? []
    if (command === undefined) throw new Error(`no opener for ${process.platform}`)
    await writeFile(join(folder, command), `#!/bin/sh\nprintf '%s' "$*" > ${JSON.stringify(given)}\nexit ${String(exit)}\n`, { mode: 0o755 })
    vi.stubEnv('PATH', `${folder}${delimiter}${process.env.PATH ?? ''}`)
    const store = createRequestStore()
    const request = store.create({ secrets: [{ name: 'TOKEN', value: PLAIN, overwrites: false }], reason: 'needed', sink })
    const present = createPresenter({
      server: { getClientCapabilities: () => ({}), elicitInput: vi.fn() },
      loopback: LOOPBACK,
      tunnelUrl: () => Promise.resolve(undefined),
      settleMs: 10,
    })
    return { present, request, given: () => readFile(given, 'utf8') }
  }

  it('is given the page and, exiting cleanly, counts as having opened it', async () => {
    const { present, request, given } = await setupOpener({ exit: 0 })
    expect(await present({ request, url: URL_UNDER_TEST })).toEqual({ channel: 'browser' })
    expect(await given()).toBe(URL_UNDER_TEST)
  })

  it('hands the agent the link when it fails', async () => {
    const { present, request } = await setupOpener({ exit: 3 })
    expect(await present({ request, url: URL_UNDER_TEST })).toMatchObject({ channel: 'result', url: URL_UNDER_TEST })
  })
})
