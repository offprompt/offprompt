import { describe, expect, it } from 'vitest'

import { askerFor, clients } from '../src/registry/clients.js'

const NO_ENV = {}

describe('who is asking', () => {
  it('names a known host properly, with its logo', () => {
    expect(askerFor({ clientInfo: { name: 'claude-code' }, env: NO_ENV })).toMatchObject({ name: 'Claude Code' })
    expect(askerFor({ clientInfo: { name: 'claude-code' }, env: NO_ENV })?.logo).toBeDefined()
    expect(askerFor({ clientInfo: { name: 'Codex CLI' }, env: NO_ENV })).toMatchObject({ name: 'Codex' })
    expect(askerFor({ clientInfo: { name: 'cursor-vscode' }, env: NO_ENV })).toMatchObject({ name: 'Cursor' })
    expect(askerFor({ clientInfo: { name: 'pi-mcp-offprompt' }, env: NO_ENV })).toMatchObject({ name: 'Pi' })
    expect(askerFor({ clientInfo: { name: 'pi-mcp-offprompt' }, env: NO_ENV })?.logo).toBeDefined()
    expect(askerFor({ clientInfo: { name: 'pinecone' }, env: NO_ENV })).toEqual({ name: 'pinecone' })
  })

  it('shows an unknown host under the name it gave, cut to a sane length', () => {
    expect(askerFor({ clientInfo: { name: 'my-agent 1.0' }, env: NO_ENV })).toEqual({ name: 'my-agent 1.0' })
    expect(askerFor({ clientInfo: { name: 'x'.repeat(100) }, env: NO_ENV })?.name).toHaveLength(40)
  })

  it('has nothing to say when the host gave no name', () => {
    expect(askerFor({ clientInfo: undefined, env: NO_ENV })).toBeUndefined()
    expect(askerFor({ clientInfo: { name: '  ' }, env: NO_ENV })).toBeUndefined()
  })

  it('says when Conductor wraps the host', () => {
    expect(askerFor({ clientInfo: { name: 'claude-code' }, env: { CONDUCTOR_WORKSPACE_ID: 'ws_1' } })).toMatchObject({
      name: 'Claude Code',
      via: 'Conductor',
    })
  })

  it('keeps every client id unique and every match lowercase', () => {
    const ids = clients.map(client => client.id)
    expect(new Set(ids).size).toBe(ids.length)
    clients.forEach(client => client.matches.forEach(match => expect(match).toBe(match.toLowerCase())))
  })
})
