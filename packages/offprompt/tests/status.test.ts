import { describe, expect, it } from 'vitest'

import { buttonFor, connectionLine, filledReport, noticeFor, progressFor } from '../src/web/client/status.js'

const FILE = '.env.local'

describe('the write button', () => {
  it('asks for the values still missing, then for fixes, then writes', () => {
    expect(buttonFor({ counts: { total: 5, ready: 0, failing: 0 }, blocker: undefined, file: FILE }).label).toBe(
      'Fill 5 values to write',
    )
    expect(buttonFor({ counts: { total: 5, ready: 4, failing: 1 }, blocker: undefined, file: FILE })).toMatchObject({
      label: 'Fix 1 value to write',
      disabled: true,
    })
    expect(buttonFor({ counts: { total: 5, ready: 5, failing: 0 }, blocker: undefined, file: FILE })).toEqual({
      label: 'Write to .env.local',
      icon: 'file-input',
      disabled: false,
      busy: false,
    })
  })

  it('waits while the server is away, turns while writing, and stays off once closed', () => {
    const ready = { total: 1, ready: 1, failing: 0 }
    expect(buttonFor({ counts: ready, blocker: 'lost', file: FILE })).toMatchObject({
      label: 'Waiting for offprompt…',
      disabled: true,
    })
    expect(buttonFor({ counts: ready, blocker: 'writing', file: FILE })).toMatchObject({
      label: 'Writing to .env.local…',
      busy: true,
    })
    expect(buttonFor({ counts: ready, blocker: 'closed', file: FILE }).disabled).toBe(true)
    expect(buttonFor({ counts: ready, blocker: 'override', file: FILE }).label).toBe('Tick the box above to write')
  })

  it('offers another go after a write the file system refused', () => {
    expect(buttonFor({ counts: { total: 1, ready: 1, failing: 0 }, blocker: undefined, file: FILE, failed: true })).toEqual({
      label: 'Try again',
      icon: 'rotate-ccw',
      disabled: false,
      busy: false,
    })
  })
})

describe('the progress line', () => {
  it('counts what is ready and what needs a fix', () => {
    expect(progressFor({ counts: { total: 5, ready: 4, failing: 1 }, writing: false })).toEqual({
      ready: '4 of 5 ready',
      note: '1 needs a fix',
      bad: true,
    })
    expect(progressFor({ counts: { total: 5, ready: 5, failing: 0 }, writing: true }).note).toBe('Writing…')
  })
})

describe('the connection', () => {
  it('says who the page is connected to and how long is left', () => {
    expect(connectionLine({ connection: { kind: 'open', secondsLeft: 272 }, asker: 'Claude Code' })).toBe(
      'Connected to Claude Code · 4:32 left',
    )
    expect(connectionLine({ connection: { kind: 'lost' }, asker: 'Claude Code' })).toBe('Reconnecting to offprompt…')
  })

  it('explains a lost server and a closed request in a banner', () => {
    expect(noticeFor({ connection: { kind: 'lost' }, remote: false })?.body).toContain('The local server stopped answering')
    expect(noticeFor({ connection: { kind: 'closed', reason: 'answered' }, remote: true })?.title).toBe(
      'This request has already been answered',
    )
    expect(noticeFor({ connection: { kind: 'open', secondsLeft: 10 }, remote: false })).toBeUndefined()
  })

  it('takes a request answered after this page posted for its own write', () => {
    const answered = { kind: 'closed', reason: 'answered' } as const
    expect(connectionLine({ connection: answered, asker: 'Claude Code', ours: true })).toBe('Written')
    expect(noticeFor({ connection: answered, remote: false, ours: true })).toMatchObject({
      tone: 'ok',
      title: 'Your values were written',
    })
  })
})

describe('the report after a fill', () => {
  it('names what needs a fix and what was skipped', () => {
    expect(
      filledReport({ filled: 5, failing: 1, ignored: ['OPENAI_API_KEY'], skipped: [], source: 'your clipboard' }),
    ).toEqual({
      title: 'Filled 5 fields from your clipboard',
      body: "1 value needs a fix. OPENAI_API_KEY was in the paste but wasn't asked for, so it was skipped.",
    })
    expect(
      filledReport({ filled: 1, failing: 0, ignored: ['A', 'B'], skipped: ['JWT_SECRET'], source: '.env.production' }),
    ).toEqual({
      title: 'Filled 1 field from .env.production',
      body: "A and B were in the file but weren't asked for, so they were skipped. JWT_SECRET is already set and kept, so the imported value was left out.",
    })
  })
})
