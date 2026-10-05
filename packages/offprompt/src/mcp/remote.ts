type Environment = Readonly<Record<string, string | undefined>>

const isSet = (value: string | undefined) => value !== undefined && value !== ''

/** Linux with no display server has no screen to open a browser on. */
const headless = ({ env, platform }: { env: Environment; platform: string }) =>
  platform === 'linux' && !isSet(env.DISPLAY) && !isSet(env.WAYLAND_DISPLAY)

/**
 * Whether this process runs somewhere the human's browser is not: Claude Code on the web,
 * an SSH session, a codespace, or a headless container. A browser opened here would land
 * on a screen the human cannot see.
 */
export const runsRemotely = ({
  env = process.env,
  platform = process.platform,
}: {
  env?: Environment
  platform?: string
} = {}) =>
  env.CLAUDE_CODE_REMOTE === 'true' ||
  isSet(env.SSH_CONNECTION) ||
  env.CODESPACES === 'true' ||
  headless({ env, platform })

/**
 * What the environment settles about where this process runs. Remote by the signs above.
 * Local on macOS or Windows with none of them: the person's own machine, since the
 * sandboxes agents run in are Linux. Unsure on a Linux machine with a display, which may be
 * a desktop or a cloud VM with a screen only the agent sees.
 */
export type Whereabouts = 'remote' | 'local' | 'unsure'

export const whereabouts = ({
  env = process.env,
  platform = process.platform,
}: {
  env?: Environment
  platform?: string
} = {}): Whereabouts => {
  if (runsRemotely({ env, platform })) return 'remote'
  return platform === 'darwin' || platform === 'win32' ? 'local' : 'unsure'
}

/**
 * `OFFPROMPT_TUNNEL=off` keeps the page on the loopback, for an environment whose port
 * forwarding already carries it to the human.
 */
export const tunnelAllowed = (env: Environment = process.env) => env.OFFPROMPT_TUNNEL !== 'off'
