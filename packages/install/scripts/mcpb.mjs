import { packExtension } from '@anthropic-ai/mcpb'
import { access, cp, mkdir, mkdtemp, readFile, rm } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'

const here = resolve(import.meta.dirname, '..')
const repository = resolve(here, '../..')
const server = dirname(createRequire(import.meta.url).resolve('offprompt/package.json'))

/**
 * What an MCP Bundle of offprompt holds: its manifest, the icon the plugin directory lists it
 * with, and the server, one file that runs on node alone, with the notices its fonts, icons and
 * logos ask to travel with it. A host that installs the bundle starts the server with node, as
 * the manifest says, so the launcher and the installer stay out.
 */
const BUNDLED = [
  { file: 'manifest.json', from: join(here, 'mcpb/manifest.json') },
  { file: 'icon.png', from: join(here, 'plugin/.claude-plugin/icon.png') },
  { file: 'dist/mcp.mjs', from: join(server, 'dist/mcp.mjs') },
  { file: 'THIRD_PARTY_NOTICES.md', from: join(server, 'THIRD_PARTY_NOTICES.md') },
  { file: 'LICENSE', from: join(repository, 'LICENSE') },
]

const exists = path =>
  access(path).then(
    () => true,
    () => false,
  )

const refuse = message => {
  process.stderr.write(`offprompt: ${message}\n`)
  process.exit(1)
}

const target = process.argv[2]
if (target === undefined) {
  process.stderr.write('usage: pnpm mcpb <file.mcpb>\n')
  process.exit(1)
}

const out = resolve(process.env.INIT_CWD ?? process.cwd(), target)
if (!out.endsWith('.mcpb')) refuse(`${out} is not a .mcpb file; name one, such as offprompt.mcpb`)

const [{ version: shipped }, { version: declared }] = await Promise.all(
  [join(server, 'package.json'), join(here, 'mcpb/manifest.json')].map(async path => JSON.parse(await readFile(path, 'utf8'))),
)
if (declared !== shipped) refuse(`mcpb/manifest.json declares ${declared}, but the server is ${shipped}; run 'pnpm version-packages'`)

const found = await Promise.all(BUNDLED.map(({ from }) => exists(from)))
const missing = BUNDLED.filter((_, index) => !found[index]).map(({ from }) => from)
if (missing.length > 0) refuse(`missing ${missing.join(', ')}; run 'pnpm mcpb' from the repository root`)

// The bundle is packed from a folder of its own, so it holds these files and nothing else.
const staged = await mkdtemp(join(tmpdir(), 'offprompt-mcpb-'))
const packed = await (async () => {
  try {
    await Promise.all(
      BUNDLED.map(async ({ file, from }) => {
        await mkdir(dirname(join(staged, file)), { recursive: true })
        await cp(from, join(staged, file))
      }),
    )
    // mcpb validates the manifest and its icon first, and says why when either fails.
    return await packExtension({ extensionPath: staged, outputPath: out })
  } finally {
    await rm(staged, { recursive: true, force: true })
  }
})()
if (!packed) refuse(`could not pack ${out}`)

process.stdout.write(`packed offprompt ${shipped} into ${out}\n`)
