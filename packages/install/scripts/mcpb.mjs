import { validateManifest } from '@anthropic-ai/mcpb'
import { zipSync } from 'fflate'
import { access, cp, mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises'
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

/**
 * The manifest the bundle carries: the one committed, with each tool's input schema as the
 * server lists it. Smithery renders a listing from a bundle's tools and takes a tool only with
 * its schema, which the MCPB schema has no field for, so the committed manifest is checked as
 * MCPB has it and the schemas go in after. A host reading the manifest as MCPB has it passes
 * over them. The names have to be the server's own, so the listing never names a tool it lacks.
 */
const withSchemas = async manifest => {
  const { tools } = JSON.parse(await readFile(join(server, 'dist/handshake/tools.json'), 'utf8'))
  const listed = new Map(tools.map(tool => [tool.name, tool.inputSchema]))
  const named = manifest.tools.map(tool => tool.name)
  if (named.length !== listed.size || named.some(name => !listed.has(name))) {
    refuse(`mcpb/manifest.json names ${named.join(', ')}, but the server lists ${[...listed.keys()].join(', ')}`)
  }
  return { ...manifest, tools: manifest.tools.map(tool => ({ ...tool, inputSchema: listed.get(tool.name) })) }
}

/** A file as the zip holds it, with its permissions where MCPB's own packer puts them. */
const entry = async path => {
  const [data, { mode }] = await Promise.all([readFile(path), stat(path)])
  return [data, { os: 3, attrs: (mode & 0o777) << 16 }]
}

// The bundle is checked in a folder of its own, where mcpb finds the manifest beside its icon.
const staged = await mkdtemp(join(tmpdir(), 'offprompt-mcpb-'))
const files = await (async () => {
  try {
    await Promise.all(
      BUNDLED.map(async ({ file, from }) => {
        await mkdir(dirname(join(staged, file)), { recursive: true })
        await cp(from, join(staged, file))
      }),
    )
    // mcpb says why when the manifest or its icon does not pass.
    if (!validateManifest(join(staged, 'manifest.json'))) return undefined
    const manifest = await withSchemas(JSON.parse(await readFile(join(staged, 'manifest.json'), 'utf8')))
    await writeFile(join(staged, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`)
    const entries = await Promise.all(BUNDLED.map(async ({ file }) => [file, await entry(join(staged, file))]))
    return Object.fromEntries(entries)
  } finally {
    await rm(staged, { recursive: true, force: true })
  }
})()
if (files === undefined) refuse(`mcpb/manifest.json does not pass as an MCPB manifest`)

await mkdir(dirname(out), { recursive: true })
await writeFile(out, zipSync(files, { level: 9 }))

process.stdout.write(`packed offprompt ${shipped} into ${out}\n`)
