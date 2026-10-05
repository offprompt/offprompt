import { expect, it } from 'vitest'

import { runsRemotely, tunnelAllowed, whereabouts } from '../src/mcp/remote.js'

const DESKTOP = { DISPLAY: ':0' }

it('takes Claude Code on the web for remote', () => {
  expect(runsRemotely({ env: { CLAUDE_CODE_REMOTE: 'true' }, platform: 'darwin' })).toBe(true)
})

it('takes an SSH session for remote', () => {
  expect(runsRemotely({ env: { SSH_CONNECTION: '10.0.0.1 50000 10.0.0.2 22' }, platform: 'darwin' })).toBe(true)
})

it('takes a codespace for remote', () => {
  expect(runsRemotely({ env: { ...DESKTOP, CODESPACES: 'true' }, platform: 'linux' })).toBe(true)
})

it('takes Linux with no display for remote', () => {
  expect(runsRemotely({ env: {}, platform: 'linux' })).toBe(true)
  expect(runsRemotely({ env: { DISPLAY: '' }, platform: 'linux' })).toBe(true)
})

it('takes a Linux desktop for local, on X11 or Wayland', () => {
  expect(runsRemotely({ env: DESKTOP, platform: 'linux' })).toBe(false)
  expect(runsRemotely({ env: { WAYLAND_DISPLAY: 'wayland-0' }, platform: 'linux' })).toBe(false)
})

it('takes a Mac or Windows session with none of the signals for local', () => {
  expect(runsRemotely({ env: {}, platform: 'darwin' })).toBe(false)
  expect(runsRemotely({ env: {}, platform: 'win32' })).toBe(false)
  expect(runsRemotely({ env: { CLAUDE_CODE_REMOTE: 'false', CODESPACES: '' }, platform: 'darwin' })).toBe(false)
})

it('settles a Mac or Windows machine with no sign of a remote one as the person\'s own', () => {
  expect(whereabouts({ env: {}, platform: 'darwin' })).toBe('local')
  expect(whereabouts({ env: {}, platform: 'win32' })).toBe('local')
  expect(whereabouts({ env: { SSH_CONNECTION: '10.0.0.1 50000 10.0.0.2 22' }, platform: 'darwin' })).toBe('remote')
  expect(whereabouts({ env: {}, platform: 'linux' })).toBe('remote')
})

it('leaves a Linux machine with a display unsettled, since a cloud VM can have one', () => {
  expect(whereabouts({ env: DESKTOP, platform: 'linux' })).toBe('unsure')
})

it('allows the tunnel unless OFFPROMPT_TUNNEL turns it off', () => {
  expect(tunnelAllowed({})).toBe(true)
  expect(tunnelAllowed({ OFFPROMPT_TUNNEL: 'off' })).toBe(false)
})
