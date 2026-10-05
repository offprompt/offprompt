/**
 * Puts the version Changesets gave offprompt into every other file that declares it: the
 * plugin's three manifests, both places in server.json, which the MCP Registry reads, and the
 * server's source, whose version it reports to a host when it starts. Each file keeps its own
 * layout: only the old version is replaced, where it stands.
 */
import { readFile, writeFile } from 'node:fs/promises'

const root = new URL('../', import.meta.url)

const { version } = JSON.parse(await readFile(new URL('packages/offprompt/package.json', root), 'utf8'))

/** How a JSON manifest declares a version. */
const IN_JSON = { pattern: /"version": "[^"]*"/g, declared: `"version": "${version}"` }

/** How the server's source declares it. */
const IN_SOURCE = { pattern: /VERSION = '[^']*'/g, declared: `VERSION = '${version}'` }

/** Every place a file declares a version, as the files are laid out. */
const DECLARED = [
  { file: 'packages/install/plugin/.claude-plugin/plugin.json', times: 1, ...IN_JSON },
  { file: 'packages/install/plugin/.codex-plugin/plugin.json', times: 1, ...IN_JSON },
  { file: 'packages/install/plugin/plugin.json', times: 1, ...IN_JSON },
  { file: 'server.json', times: 2, ...IN_JSON },
  { file: 'packages/offprompt/src/version.ts', times: 1, ...IN_SOURCE },
]

await Promise.all(
  DECLARED.map(async ({ file, times, pattern, declared }) => {
    const path = new URL(file, root)
    const text = await readFile(path, 'utf8')
    const found = text.match(pattern)?.length ?? 0
    if (found !== times) throw new Error(`${file} declares a version ${String(found)} times, not ${String(times)}`)
    await writeFile(path, text.replace(pattern, declared))
  }),
)

process.stdout.write(`every manifest now declares ${version}\n`)
