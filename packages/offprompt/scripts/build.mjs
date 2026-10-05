import { LATEST_PROTOCOL_VERSION, SUPPORTED_PROTOCOL_VERSIONS } from '@modelcontextprotocol/sdk/types.js'
import { build as esbuild, buildSync } from 'esbuild'
import { spawn } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { createInterface } from 'node:readline'
import { fileURLToPath } from 'node:url'

import { writeNotices } from './notices.mjs'

const root = resolve(import.meta.dirname, '..')

/**
 * The script the entry page runs, bundled for the browser. It shares the dotenv parser
 * with the sinks, so a pasted block is read exactly the way the file will be.
 */
const clientOptions = {
  absWorkingDir: root,
  entryPoints: ['src/web/client/form.ts'],
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: 'es2022',
  minify: true,
  legalComments: 'none',
  write: false,
}

/** The page script as text, for embedding. Synchronous so the test config can use it too. */
export const pasteScript = () => {
  const [output] = buildSync(clientOptions).outputFiles
  if (output === undefined) throw new Error('the paste script produced no output')
  return output.text
}

/**
 * The stand-in for the server on a page people can try on the website, as text. It exposes
 * its `start` as `offpromptDemo`, for the showcase to call with the request's own details.
 */
export const demoScript = () => {
  const [output] = buildSync({
    ...clientOptions,
    entryPoints: ['src/web/showcase/demo.ts'],
    globalName: 'offpromptDemo',
  }).outputFiles
  if (output === undefined) throw new Error('the demo script produced no output')
  return output.text
}

/**
 * The page's two typefaces, Latin only, each a variable font covering every weight. They
 * travel inside the page, because the page loads nothing from the network.
 */
const FONTS = [
  { family: 'Geist', file: '@fontsource-variable/geist/files/geist-latin-wght-normal.woff2' },
  { family: 'JetBrains Mono', file: '@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2' },
]

const fontFace = ({ family, file }) => {
  const data = readFileSync(resolve(root, 'node_modules', file)).toString('base64')
  return `@font-face { font-family: '${family}'; font-style: normal; font-weight: 100 900; font-display: block; src: url(data:font/woff2;base64,${data}) format('woff2'); }`
}

/** The `@font-face` rules, as CSS. */
export const fontFaces = () => FONTS.map(fontFace).join('\n')

/** Defines that inline the page script and fonts into whatever bundle imports them. */
export const clientDefines = () => ({
  OFFPROMPT_PASTE_SCRIPT: JSON.stringify(pasteScript()),
  OFFPROMPT_DEMO_SCRIPT: JSON.stringify(demoScript()),
  OFFPROMPT_FONT_FACES: JSON.stringify(fontFaces()),
})

const nodeBundle = {
  absWorkingDir: root,
  outdir: 'dist',
  outExtension: { '.js': '.mjs' },
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'esm',
  sourcemap: false,
  minify: false,
  legalComments: 'none',
  logLevel: 'info',
}

/** The built server's answers to what a host asks first, by the ids they were asked under. */
const askBuiltServer = async messages => {
  const child = spawn(process.execPath, [resolve(root, 'dist/mcp.mjs')], { cwd: tmpdir(), stdio: ['pipe', 'pipe', 'ignore'] })
  const asked = messages.filter(message => message.id !== undefined).map(message => message.id)
  const answers = new Promise((done, failed) => {
    const lines = createInterface({ input: child.stdout })
    const received = []
    lines.on('line', line => {
      received.push(JSON.parse(line))
      const replies = asked.map(id => received.find(message => message.id === id))
      if (replies.every(reply => reply !== undefined)) done(replies)
    })
    child.once('exit', code => failed(new Error(`the built server exited with ${code} before it answered`)))
  })
  messages.forEach(message => child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', ...message })}\n`))
  return answers.finally(() => child.kill())
}

/**
 * Requests a host may send that a server with tools alone does not handle, Claude Code's
 * discovery probe ahead of initialize among them. Those the built server says it does not know
 * get the same answer from the launcher, so none of them starts the server.
 */
const OTHER_METHODS = [
  'server/discover',
  'prompts/list',
  'resources/list',
  'resources/templates/list',
  'logging/setLevel',
  'completion/complete',
]

const METHOD_NOT_FOUND = -32601

/**
 * What the server says when a host opens a session, saved beside it for the plugin's launcher
 * to say without starting the server: the initialize result less its protocol version, which
 * follows the version the host asks for, the tool list, the versions it speaks, newest first,
 * and the requests it does not know, with how it says so.
 */
const writeHandshake = async () => {
  const [opening, tools, ...others] = await askBuiltServer([
    {
      id: 1,
      method: 'initialize',
      params: { protocolVersion: LATEST_PROTOCOL_VERSION, capabilities: {}, clientInfo: { name: 'offprompt-build', version: '0' } },
    },
    { method: 'notifications/initialized' },
    { id: 2, method: 'tools/list' },
    ...OTHER_METHODS.map((method, index) => ({ id: 3 + index, method, params: {} })),
  ])
  const refused = [opening, tools].find(reply => reply.result === undefined)
  if (refused !== undefined) throw new Error(`the built server refused the opening: ${JSON.stringify(refused)}`)
  const unknown = others.flatMap((reply, index) => (reply.error?.code === METHOD_NOT_FOUND ? [{ method: OTHER_METHODS[index], error: reply.error }] : []))
  const rest = Object.fromEntries(Object.entries(opening.result).filter(([key]) => key !== 'protocolVersion'))
  const versions = [LATEST_PROTOCOL_VERSION, ...SUPPORTED_PROTOCOL_VERSIONS.filter(version => version !== LATEST_PROTOCOL_VERSION)]
  const folder = resolve(root, 'dist/handshake')
  await mkdir(folder, { recursive: true })
  await Promise.all([
    writeFile(resolve(folder, 'initialize.json'), JSON.stringify(rest).slice(1, -1)),
    writeFile(resolve(folder, 'tools.json'), JSON.stringify(tools.result)),
    writeFile(resolve(folder, 'versions'), `${versions.join('\n')}\n`),
    writeFile(resolve(folder, 'unknown'), unknown.map(({ method }) => `${method}\n`).join('')),
    writeFile(resolve(folder, 'not-found.json'), JSON.stringify(unknown[0]?.error ?? { code: METHOD_NOT_FOUND, message: 'Method not found' })),
  ])
}

/**
 * The bundle the plugin runs, self-contained so `dist/` needs nothing beside it, what it says
 * when a session opens, and the licences of the packages it carries. Beside it, the page as
 * the website shows it, which the plugin never loads.
 */
export const build = async () => {
  const define = clientDefines()
  const [server] = await Promise.all([
    esbuild({
      ...nodeBundle,
      entryPoints: [{ in: 'src/mcp/main.ts', out: 'mcp' }],
      banner: { js: '#!/usr/bin/env node' },
      define,
      metafile: true,
    }),
    esbuild({ ...nodeBundle, entryPoints: [{ in: 'src/showcase.ts', out: 'showcase' }], define }),
  ])
  // The page script travels inside the server as text, so the code it bundles ships too. The
  // inputs of both are saved beside the bundle for the tests.
  const page = buildSync({ ...clientOptions, metafile: true })
  const inputs = { ...server.metafile.inputs, ...page.metafile.inputs }
  await writeFile(resolve(root, 'dist/mcp.meta.json'), JSON.stringify({ inputs }))
  await writeNotices('mcp.mjs', [server.metafile, page.metafile], root)
  await writeHandshake()
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await build()
