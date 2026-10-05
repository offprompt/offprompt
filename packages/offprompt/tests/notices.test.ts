import { readFile } from 'node:fs/promises'
import { expect, it } from 'vitest'

const read = (path: string) => readFile(new URL(path, import.meta.url), 'utf8')

/** The npm package an esbuild input came from, read off its path alone, or none for offprompt's own source. */
const packageOf = (input: string) => {
  const parts = input.split('node_modules/')
  const [scope = '', name = ''] = (parts.length > 1 ? (parts.at(-1) ?? '') : '').split('/')
  return scope === '' ? [] : [scope.startsWith('@') ? `${scope}/${name}` : scope]
}

it('names every npm package bundled into the server in the notices that travel with it', async () => {
  const { inputs } = JSON.parse(await read('../dist/mcp.meta.json')) as { inputs: Record<string, unknown> }
  const notices = await read('../THIRD_PARTY_NOTICES.md')
  const bundled = [...new Set(Object.keys(inputs).flatMap(packageOf))]

  expect(bundled).toContain('@modelcontextprotocol/sdk')
  expect(bundled.filter(name => !notices.includes(`\n### ${name} `))).toEqual([])
})
