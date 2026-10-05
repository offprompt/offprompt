import { expect, it } from 'vitest'

import { codex } from '../src/mcp/hosts/codex.js'
import { cursor } from '../src/mcp/hosts/cursor.js'
import { workspacesNamedIn } from '../src/mcp/hosts.js'

const PROJECT = '/Users/someone/projects/acme'

const NO_ENV = {}

it("reads Codex's workspaces from its turn metadata, the main one first", () => {
  const meta = {
    callId: 'exec-1',
    'x-codex-turn-metadata': { workspaces: { [PROJECT]: { has_changes: true }, '/Users/someone/notes': {} } },
  }

  expect(codex.workspacesIn({ meta, env: NO_ENV })).toEqual([PROJECT, '/Users/someone/notes'])
})

it('takes no workspace Codex names by a relative path or under another key', () => {
  const relative = { 'x-codex-turn-metadata': { workspaces: { 'relative/path': {} } } }
  expect(codex.workspacesIn({ meta: relative, env: NO_ENV })).toEqual([])
  expect(codex.workspacesIn({ meta: { workspaces: { [PROJECT]: {} } }, env: NO_ENV })).toEqual([])
  expect(codex.workspacesIn({ meta: undefined, env: NO_ENV })).toEqual([])
})

it("reads Cursor's open folders from the environment it starts a server with", () => {
  const env = { WORKSPACE_FOLDER_PATHS: `${PROJECT},/Users/someone/notes` }

  expect(cursor.workspacesIn({ meta: undefined, env })).toEqual([PROJECT, '/Users/someone/notes'])
  expect(cursor.workspacesIn({ meta: undefined, env: { WORKSPACE_FOLDER_PATHS: '' } })).toEqual([])
  expect(cursor.workspacesIn({ meta: undefined, env: { WORKSPACE_FOLDER_PATHS: 'relative' } })).toEqual([])
})

it('asks every host with a convention of its own', () => {
  const meta = { 'x-codex-turn-metadata': { workspaces: { [PROJECT]: {} } } }
  expect(workspacesNamedIn({ meta, env: NO_ENV })).toEqual([PROJECT])
  expect(workspacesNamedIn({ meta: { progressToken: 1 }, env: { WORKSPACE_FOLDER_PATHS: PROJECT } })).toEqual([PROJECT])
  expect(workspacesNamedIn({ meta: { progressToken: 1 }, env: NO_ENV })).toEqual([])
})
