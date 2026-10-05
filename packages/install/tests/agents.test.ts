import { execFile } from 'node:child_process'
import { access, appendFile, chmod, constants, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { delimiter, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { afterEach, describe, expect, it } from 'vitest'

import { FORWARDED } from '../src/targets/codex.js'

type Teardown = () => Promise<void>

const teardowns: Teardown[] = []

const run = promisify(execFile)

const INSTALLER = fileURLToPath(new URL('../dist/offprompt-install.mjs', import.meta.url))

const PACKAGE = fileURLToPath(new URL('../scripts/package.mjs', import.meta.url))

const WINDOWS = process.platform === 'win32'

/**
 * Stands in for an agent's CLI: records each call, one line of arguments per call. On Windows
 * it is a .cmd file, as npm installs a CLI there, that hands its arguments to a Node script to
 * record, since cmd.exe would keep the quotes they arrive in.
 */
const FAKE_CLI = WINDOWS
  ? '@node "%~dp0record.mjs" %~n0 %*\r\n'
  : `#!/bin/sh
echo "$*" >> "$HOME/$(basename "$0").log"
`

/** What the Windows stand-ins run: appends the arguments to the log named after the CLI. */
const RECORD = `import { appendFileSync } from 'node:fs'
import { join } from 'node:path'
const [name, ...args] = process.argv.slice(2)
appendFileSync(join(process.env.USERPROFILE, name + '.log'), args.join(' ') + '\\n')
`

/** The file an agent's CLI is on this platform. */
const cliFile = ({ bin, command }: { bin: string; command: string }) => join(bin, WINDOWS ? `${command}.cmd` : command)

/**
 * What Windows needs to start a process at all, which a bare environment would leave out: among
 * it ComSpec, the cmd.exe a .cmd CLI is started through.
 */
const WINDOWS_BASICS = WINDOWS
  ? {
      SystemRoot: process.env.SystemRoot,
      ComSpec: process.env.ComSpec,
      PATHEXT: process.env.PATHEXT,
      TEMP: process.env.TEMP,
      TMP: process.env.TMP,
    }
  : {}

const agents = (...names: readonly string[]) => names.flatMap(name => ['--agent', name])

const exists = (path: string) =>
  access(path).then(
    () => true,
    () => false,
  )

const executable = (path: string) =>
  access(path, constants.X_OK).then(
    () => true,
    () => false,
  )

const readJson = async (path: string): Promise<unknown> => JSON.parse(await readFile(path, 'utf8'))

/**
 * How an agent configured outside a plugin starts offprompt from the plugin folder: through
 * the launcher, and on Windows, which runs no sh script by itself, with node.
 */
const startedFrom = (plugin: string) =>
  process.platform === 'win32'
    ? { command: 'node', args: [join(plugin, 'dist/mcp.mjs')] }
    : { command: join(plugin, 'launcher/offprompt-mcp') }

/** What a run that should fail wrote to stderr, or nothing if it succeeded. */
const refusalOf = (running: Promise<unknown>) =>
  running.then(
    () => '',
    (error: unknown) => (error !== null && typeof error === 'object' && 'stderr' in error ? String(error.stderr) : ''),
  )

const scratch = async (prefix: string) => {
  const path = await mkdtemp(join(tmpdir(), prefix))
  teardowns.push(() => rm(path, { recursive: true, force: true }))
  return path
}

/**
 * A machine of its own: a home directory, `claude` and `codex` on `PATH` that only record
 * what they were asked, a packaged plugin to install from, and a project to install into.
 * `install` runs the installer this repository builds, and `installPackaged` the one in the
 * package, as npx runs it.
 */
const setupMachine = async () => {
  const home = await scratch('offprompt-home-')
  const plugin = await scratch('offprompt-plugin-')
  const project = await scratch('offprompt-project-')

  const bin = join(home, 'bin')
  await mkdir(bin)
  await Promise.all(
    ['claude', 'codex'].map(async command => {
      await writeFile(cliFile({ bin, command }), FAKE_CLI)
      await chmod(cliFile({ bin, command }), 0o755)
    }),
  )
  if (WINDOWS) await writeFile(join(bin, 'record.mjs'), RECORD)
  await run(process.execPath, [PACKAGE, plugin])

  // Node reads the home directory from USERPROFILE on Windows and from HOME elsewhere.
  const env = {
    ...WINDOWS_BASICS,
    HOME: home,
    USERPROFILE: home,
    PATH: [bin, dirname(process.execPath), ...(WINDOWS ? [] : ['/usr/bin', '/bin'])].join(delimiter),
  }
  // A run that fails says what it printed too: the installer reports each agent's step there.
  const installWith =
    (cli: string) =>
    (...args: readonly string[]) =>
      run(process.execPath, [cli, ...args], { env }).catch((error: unknown) => {
        if (error instanceof Error && 'stdout' in error) error.message = `${error.message}\n${String(error.stdout)}`
        throw error
      })
  const callsTo = async (command: string) =>
    (await readFile(join(home, `${command}.log`), 'utf8').catch(() => '')).split('\n').filter(line => line !== '')

  return {
    home,
    plugin,
    project,
    bin,
    install: installWith(INSTALLER),
    installPackaged: installWith(join(plugin, 'dist/offprompt-install.mjs')),
    installWith,
    /** Where -g keeps the plugin, in this machine's home directory. */
    settled: join(home, '.local/share/offprompt'),
    callsTo,
  }
}

afterEach(async () => {
  await Promise.all(teardowns.splice(0).map(teardown => teardown()))
})

describe('in a project', () => {
  it('carries the bundle and declares it for each agent, beside what the project already declares', async () => {
    const { project, install } = await setupMachine()
    await writeFile(join(project, '.mcp.json'), JSON.stringify({ mcpServers: { other: { command: 'other' } } }))
    await mkdir(join(project, '.codex'))
    await writeFile(join(project, '.codex/config.toml'), '# mine\n[mcp_servers.other]\ncommand = "other" # keep\n')

    await install('--project', project, ...agents('claude-code', 'codex', 'pi', 'cursor'))
    await install('--project', project, ...agents('codex'))

    expect(await exists(join(project, 'tools/offprompt/mcp.mjs'))).toBe(true)
    expect(await exists(join(project, 'tools/offprompt/THIRD_PARTY_NOTICES.md'))).toBe(true)
    expect(await readJson(join(project, '.mcp.json'))).toEqual({
      mcpServers: {
        other: { command: 'other' },
        offprompt: { type: 'stdio', command: 'node', args: ['tools/offprompt/mcp.mjs'], timeout: 330_000 },
      },
    })
    expect(await readFile(join(project, '.codex/config.toml'), 'utf8')).toBe(
      '# mine\n[mcp_servers.other]\ncommand = "other" # keep\n\n' +
        '[mcp_servers.offprompt]\ncommand = "node"\nargs = ["tools/offprompt/mcp.mjs"]\ntool_timeout_sec = 330\n' +
        `env_vars = [${FORWARDED.map(name => `"${name}"`).join(', ')}]\n`,
    )
    expect(await readJson(join(project, '.pi/mcp-adapter.json'))).toEqual({
      mcpServers: {
        offprompt: { command: 'node', args: ['tools/offprompt/mcp.mjs'], requestTimeoutMs: 330_000, directTools: true },
      },
    })
    expect(await readJson(join(project, '.pi/settings.json'))).toEqual({ packages: ['npm:pi-mcp-adapter@3.1.0'] })
    expect(await readJson(join(project, '.cursor/mcp.json'))).toEqual({
      mcpServers: { offprompt: { command: 'node', args: ['tools/offprompt/mcp.mjs'] } },
    })
  })

  it('does the same for init and for add, its earlier name', async () => {
    const { project, install } = await setupMachine()
    const other = await scratch('offprompt-project-')

    await install('init', '--project', project, ...agents('claude-code', 'codex'))
    await install('add', '--project', other, ...agents('claude-code', 'codex'))

    expect(await readFile(join(other, '.mcp.json'), 'utf8')).toBe(await readFile(join(project, '.mcp.json'), 'utf8'))
    expect(await readFile(join(other, '.codex/config.toml'), 'utf8')).toBe(
      await readFile(join(project, '.codex/config.toml'), 'utf8'),
    )
  })

  it('copies the server from the package it runs from', async () => {
    const { plugin, project, installPackaged } = await setupMachine()
    // Marked, so the copy is known to come from the package and not from this repository.
    await appendFile(join(plugin, 'dist/mcp.mjs'), '\n// as packaged\n')

    await installPackaged('init', '--project', project, ...agents('claude-code'))

    expect(await readFile(join(project, 'tools/offprompt/mcp.mjs'), 'utf8')).toBe(
      await readFile(join(plugin, 'dist/mcp.mjs'), 'utf8'),
    )
    expect(await exists(join(project, 'tools/offprompt/THIRD_PARTY_NOTICES.md'))).toBe(true)
    expect(await readJson(join(project, '.mcp.json'))).toEqual({
      mcpServers: { offprompt: { type: 'stdio', command: 'node', args: ['tools/offprompt/mcp.mjs'], timeout: 330_000 } },
    })
  })

  it("moves Pi's entry to where adapters from 3.0 read it, and pins the adapter", async () => {
    const { project, install } = await setupMachine()
    await mkdir(join(project, '.pi'))
    const earlier = { command: 'node', args: ['tools/offprompt/mcp.mjs'] }
    await writeFile(join(project, '.pi/mcp.json'), JSON.stringify({ mcpServers: { offprompt: earlier } }))
    await writeFile(join(project, '.pi/settings.json'), JSON.stringify({ packages: ['npm:other', 'npm:pi-mcp-adapter'] }))

    await install('--project', project, ...agents('pi'))

    expect(await exists(join(project, '.pi/mcp.json'))).toBe(false)
    expect(await readJson(join(project, '.pi/mcp-adapter.json'))).toMatchObject({ mcpServers: { offprompt: earlier } })
    expect(await readJson(join(project, '.pi/settings.json'))).toEqual({ packages: ['npm:other', 'npm:pi-mcp-adapter@3.1.0'] })
  })

  it('takes offprompt out and leaves the rest of the project as it was', async () => {
    const { project, install } = await setupMachine()
    await writeFile(join(project, '.mcp.json'), JSON.stringify({ mcpServers: { other: { command: 'other' } } }))
    await install('--project', project, ...agents('claude-code', 'codex', 'pi'))

    await install('remove', '--project', project)

    expect(await readJson(join(project, '.mcp.json'))).toEqual({ mcpServers: { other: { command: 'other' } } })
    expect(await exists(join(project, '.codex/config.toml'))).toBe(false)
    expect(await exists(join(project, '.pi/mcp-adapter.json'))).toBe(false)
    expect(await exists(join(project, 'tools'))).toBe(false)
  })

  it('writes for the agents found on this machine, and notes those it cannot reach in a project', async () => {
    const { home, project, install } = await setupMachine()
    await mkdir(join(home, '.gemini'))

    const { stdout } = await install('--project', project)

    expect((await readdir(project)).sort()).toEqual(['.codex', '.mcp.json', 'tools'])
    expect(stdout).toContain('- Gemini CLI: no project config yet')
    await expect(install('--project', project, ...agents('gemini-cli'))).rejects.toMatchObject({ code: 1 })
  })

  it('refuses the home directory as a project', async () => {
    const { home, install } = await setupMachine()

    expect(await refusalOf(install('--project', home, ...agents('claude-code')))).toContain('is not a project')
    expect(await exists(join(home, '.mcp.json'))).toBe(false)
  })
})

describe('for you, with -g', () => {
  it('installs the plugin into Claude Code, Codex and Cursor, and the server into Pi', async () => {
    const { home, plugin, install, callsTo } = await setupMachine()

    const { stdout } = await install('-g', '--from', plugin, ...agents('claude-code', 'codex', 'cursor', 'pi'))

    expect(stdout.split('\n').filter(line => line.startsWith('✓'))).toHaveLength(4)
    expect(await callsTo('claude')).toEqual([
      'plugin uninstall offprompt@offprompt',
      'plugin marketplace remove offprompt',
      `plugin marketplace add ${plugin}`,
      'plugin install offprompt@offprompt',
    ])
    expect(await callsTo('codex')).toEqual([
      'plugin remove offprompt@offprompt',
      'plugin marketplace remove offprompt',
      `plugin marketplace add ${plugin}`,
      'plugin add offprompt@offprompt',
    ])
    expect(await executable(join(home, '.cursor/plugins/local/offprompt/launcher/offprompt-mcp'))).toBe(true)
    expect(await readJson(join(home, '.pi/agent/mcp-adapter.json'))).toMatchObject({
      mcpServers: { offprompt: { ...startedFrom(plugin), requestTimeoutMs: 330_000 } },
    })
    expect(await readJson(join(home, '.pi/agent/settings.json'))).toEqual({ packages: ['npm:pi-mcp-adapter@3.1.0'] })
  })

  it('takes offprompt out of every agent that has it', async () => {
    const { home, plugin, install, callsTo } = await setupMachine()
    await install('-g', '--from', plugin, ...agents('cursor', 'gemini-cli', 'claude-code'))

    const { stdout } = await install('remove', '-g')

    expect(await exists(join(home, '.cursor/plugins/local/offprompt'))).toBe(false)
    expect(JSON.stringify(await readJson(join(home, '.gemini/settings.json')))).not.toContain('offprompt')
    expect((await callsTo('claude')).slice(-2)).toEqual([
      'plugin uninstall offprompt@offprompt',
      'plugin marketplace remove offprompt',
    ])
    expect(stdout).toContain('✓ Gemini CLI: server removed from')
  })

  it('declares the server in ~/.claude.json where no claude is on PATH yet', async () => {
    const { home, plugin, bin, install } = await setupMachine()
    await rm(cliFile({ bin, command: 'claude' }))

    await install('-g', '--from', plugin, ...agents('claude-code'))
    expect(await readJson(join(home, '.claude.json'))).toMatchObject({ mcpServers: { offprompt: startedFrom(plugin) } })

    await install('remove', '-g', ...agents('claude-code'))
    expect(await readFile(join(home, '.claude.json'), 'utf8')).not.toContain('offprompt')
  })

  it('refuses a directory holding no package', async () => {
    const { home, install } = await setupMachine()

    expect(await refusalOf(install('-g', '--from', home, ...agents('cursor')))).toContain('holds no packaged offprompt')
    expect(await exists(join(home, '.cursor'))).toBe(false)
  })
})

describe('for you, with -g, from the package npx runs', () => {
  it('copies the package to a folder that stays, and installs every agent from there', async () => {
    const { home, settled, installPackaged, callsTo } = await setupMachine()

    const { stdout } = await installPackaged('init', '-g', ...agents('claude-code', 'cursor', 'pi'))

    expect(stdout).toContain(`✓ offprompt: plugin in ${settled}\n`)
    expect(await executable(join(settled, 'launcher/offprompt-mcp'))).toBe(true)
    expect(await exists(join(settled, 'dist/mcp.mjs'))).toBe(true)
    expect(await callsTo('claude')).toContain(`plugin marketplace add ${settled}`)
    expect(await executable(join(home, '.cursor/plugins/local/offprompt/launcher/offprompt-mcp'))).toBe(true)
    expect(await readJson(join(home, '.pi/agent/mcp-adapter.json'))).toMatchObject({ mcpServers: { offprompt: startedFrom(settled) } })
    // The copy's own manifests start the bundle with node on Windows, and the launcher elsewhere.
    expect(await readJson(join(settled, '.mcp.json'))).toMatchObject({
      mcpServers: {
        offprompt:
          process.platform === 'win32'
            ? { command: 'node', args: ['${CLAUDE_PLUGIN_ROOT}/dist/mcp.mjs'] }
            : { command: '${CLAUDE_PLUGIN_ROOT}/launcher/offprompt-mcp' },
      },
    })
    // The copy was made beside the folder and moved into place, and nothing of it is left over.
    expect(await readdir(dirname(settled))).toEqual(['offprompt'])
  })

  it('replaces a copy it made before, and installs from that copy as it stands', async () => {
    const { settled, installPackaged, installWith, callsTo } = await setupMachine()
    await installPackaged('init', '-g', ...agents('claude-code'))
    await writeFile(join(settled, 'stale.txt'), 'from an older version\n')

    await installPackaged('init', '-g', ...agents('claude-code'))
    expect(await exists(join(settled, 'stale.txt'))).toBe(false)

    const { stdout } = await installWith(join(settled, 'dist/offprompt-install.mjs'))('init', '-g', ...agents('claude-code'))
    expect(stdout).not.toContain('plugin in')
    expect((await callsTo('claude')).filter(call => call === `plugin marketplace add ${settled}`)).toHaveLength(3)
  })

  it('replaces a plugin packaged when the launcher was in bin/', async () => {
    const { settled, installPackaged } = await setupMachine()
    await mkdir(join(settled, 'bin'), { recursive: true })
    await writeFile(join(settled, 'bin/offprompt-mcp'), '#!/bin/sh\n')

    await installPackaged('init', '-g', ...agents('pi'))

    expect(await exists(join(settled, 'bin'))).toBe(false)
    expect(await executable(join(settled, 'launcher/offprompt-mcp'))).toBe(true)
  })

  it('leaves a folder it did not make as it is', async () => {
    const { home, settled, installPackaged } = await setupMachine()
    await mkdir(settled, { recursive: true })
    await writeFile(join(settled, 'notes.md'), 'keep me\n')

    expect(await refusalOf(installPackaged('init', '-g', ...agents('cursor')))).toContain('holds other files')
    expect(await readdir(settled)).toEqual(['notes.md'])
    expect(await exists(join(home, '.cursor'))).toBe(false)
  })

  it('takes the copy away with offprompt, from every agent', async () => {
    const { home, settled, installPackaged } = await setupMachine()
    await installPackaged('init', '-g', ...agents('cursor', 'pi'))

    await installPackaged('remove', '-g', ...agents('pi'))
    expect(await exists(settled)).toBe(true)

    const { stdout } = await installPackaged('remove', '-g')
    expect(stdout).toContain(`✓ offprompt: removed ${settled}\n`)
    expect(await exists(settled)).toBe(false)
    expect(await exists(join(home, '.cursor/plugins/local/offprompt'))).toBe(false)
  })
})

it('lists every agent, whether it was found, and how offprompt reaches it', async () => {
  const { home, bin, install } = await setupMachine()
  await rm(cliFile({ bin, command: 'codex' }))
  await mkdir(join(home, '.gemini'))

  const { stdout } = await install('list')
  const row = (agent: string) => stdout.split('\n').find(line => line.startsWith(`${agent} `)) ?? ''

  expect(row('claude-code')).toMatch(/yes\s+\.mcp\.json\s+plugin$/)
  expect(row('codex')).toMatch(/-\s+\.codex\/config\.toml\s+plugin$/)
  expect(row('gemini-cli')).toMatch(/yes\s+-\s+MCP config$/)
  expect(row('claude-desktop')).toBe('')
})

it('refuses an agent it does not know', async () => {
  const { install } = await setupMachine()

  expect(await refusalOf(install(...agents('notepad')))).toContain('no agent called notepad')
})
