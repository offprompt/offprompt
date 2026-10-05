/**
 * Puts the version Changesets gave offprompt into every other file that declares it: the
 * plugin's three manifests, and both places in server.json, which the MCP Registry reads.
 * Each file keeps its own layout: only the old version is replaced, where it stands.
 */
import { readFile, writeFile } from 'node:fs/promises'

const root = new URL('../', import.meta.url)

const { version } = JSON.parse(await readFile(new URL('packages/offprompt/package.json', root), 'utf8'))

/** Every place a file declares a version, as the files are laid out. */
const DECLARED = [
  { file: 'packages/install/plugin/.claude-plugin/plugin.json', times: 1 },
  { file: 'packages/install/plugin/.codex-plugin/plugin.json', times: 1 },
  { file: 'packages/install/plugin/plugin.json', times: 1 },
  { file: 'server.json', times: 2 },
]

const VERSION_FIELD = /"version": "[^"]*"/g

await Promise.all(
  DECLARED.map(async ({ file, times }) => {
    const path = new URL(file, root)
    const text = await readFile(path, 'utf8')
    const found = text.match(VERSION_FIELD)?.length ?? 0
    if (found !== times) throw new Error(`${file} declares a version ${String(found)} times, not ${String(times)}`)
    await writeFile(path, text.replace(VERSION_FIELD, `"version": "${version}"`))
  }),
)

process.stdout.write(`every manifest now declares ${version}\n`)
