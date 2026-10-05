import { spawn } from 'node:child_process'

import type { ClientCapabilities, ElicitRequestURLParams } from '@modelcontextprotocol/sdk/types.js'

import { isRecord } from '../core/guards.js'
import type { SecretRequest } from '../core/store.js'

/** Which channel carried the URL to the human. */
export type Presentation =
  | { readonly channel: 'elicitation' }
  | { readonly channel: 'browser' }
  | { readonly channel: 'result'; readonly url: string; readonly reason: string }
  | {
      /**
       * The page of a request made from a sandbox, reached over a tunnel or the vendor's port
       * forwarding. The agent always passes the link on, whatever dialog the host shows.
       */
      readonly channel: 'remote'
      readonly url: string
      readonly via: 'tunnel' | 'loopback'
      readonly port: number
    }

/** The part of the MCP server the ladder reaches for. */
export type ElicitationChannel = {
  getClientCapabilities: () => ClientCapabilities | undefined
  elicitInput: (params: ElicitRequestURLParams) => Promise<unknown>
}

const ELICITATION_SETTLE_MS = 1500

const LAUNCH_ASSUMED_MS = 2000

const OPENERS: Readonly<Record<string, readonly string[]>> = {
  darwin: ['open'],
  linux: ['xdg-open'],
  freebsd: ['xdg-open'],
  openbsd: ['xdg-open'],
  win32: ['rundll32', 'url.dll,FileProtocolHandler'],
}

/** The platform's own URL handler, never a shell. */
export const openerFor = (platform: string) => OPENERS[platform]

const delay = (ms: number) =>
  new Promise<void>(resolve => {
    setTimeout(resolve, ms).unref()
  })

/**
 * Hands the URL to the platform opener. A launcher still running after a couple of
 * seconds counts as working, because that is what a browser starting up looks like.
 */
const spawnOpener = async (url: string) => {
  const [command, ...args] = openerFor(process.platform) ?? []
  if (command === undefined) return false
  const child = spawn(command, [...args, url], { stdio: 'ignore', detached: true })
  child.unref()
  const exited = new Promise<number | undefined>(resolve => {
    child.once('error', () => resolve(undefined))
    child.once('exit', code => resolve(code ?? undefined))
  })
  return (await Promise.race([exited, delay(LAUNCH_ASSUMED_MS).then(() => 0)])) === 0
}

/**
 * Offers the URL through the host's own dialog, and says whether the person took it. Only an
 * accept within the wait means they are on their way to the page. A decline or a cancel means
 * they are not, as with \`codex exec\`, which cancels every dialog it cannot show, and an error
 * means the host cannot show one. A dialog still open when the wait ends counts for nothing
 * either: a host can take URL dialogs and never show one, as Claude's Agent SDK under
 * Conductor did, and then nobody is looking at it. Each leaves the ladder free to fall through.
 */
const offerElicitation = async ({
  server,
  request,
  url,
  settleMs,
}: {
  server: ElicitationChannel
  request: SecretRequest
  url: string
  settleMs: number
}) => {
  if (server.getClientCapabilities()?.elicitation?.url === undefined) return false
  const pending = server
    .elicitInput({
      mode: 'url',
      message: `offprompt is collecting ${request.secrets.map(secret => secret.name).join(', ')}. Open the page to type ${request.secrets.length > 1 ? 'them' : 'it'}.`,
      elicitationId: request.id,
      url,
    })
    .then(
      answer => (isRecord(answer) && answer.action === 'accept' ? ('accepted' as const) : ('refused' as const)),
      () => 'refused' as const,
    )
  const outcome = await Promise.race([pending, delay(settleMs).then(() => 'pending' as const)])
  return outcome === 'accepted'
}

/** Where a remote request's page can be reached, and the key its values are sealed to. */
export type RemoteLink = { readonly path: string; readonly publicKey: string }

/**
 * The presentation ladder. On the human's machine the model never carries the URL unless
 * no local channel worked, and the result says so when that happens. From a sandbox the
 * platform opener is never run: a browser there is on a screen the human cannot see. The
 * page is exposed through the tunnel, or left on the loopback for the vendor's port
 * forwarding to carry. The link always goes into the result for the agent to show, and to the
 * host's dialog as well where it takes one: the page is sealed to a key after the `#`, so the
 * link is no secret, and a host's dialog is not always one anybody sees.
 */
export const createPresenter = ({
  server,
  loopback,
  tunnelUrl,
  openUrl = spawnOpener,
  settleMs = ELICITATION_SETTLE_MS,
}: {
  server: ElicitationChannel
  loopback: { readonly origin: string; readonly port: number }
  /** The tunnel's public address, or nothing when no tunnel comes up. */
  tunnelUrl: () => Promise<string | undefined>
  openUrl?: (url: string) => Promise<boolean>
  settleMs?: number
}) => {
  const presentRemote = async ({ request, link }: { request: SecretRequest; link: RemoteLink }): Promise<Presentation> => {
    const tunnel = await tunnelUrl()
    // The key rides after the `#`, which no tunnel or proxy receives. It is a public key, so the
    // transcript holding the link is harmless.
    const url = `${tunnel ?? loopback.origin}${link.path}#k=${link.publicKey}`
    void offerElicitation({ server, request, url, settleMs })
    return { channel: 'remote', url, via: tunnel === undefined ? 'loopback' : 'tunnel', port: loopback.port }
  }

  return async ({
    request,
    url,
    remote,
  }: {
    request: SecretRequest
    url: string
    remote?: RemoteLink
  }): Promise<Presentation> => {
    if (remote !== undefined) return presentRemote({ request, link: remote })
    if (await offerElicitation({ server, request, url, settleMs })) return { channel: 'elicitation' }
    if (await openUrl(url)) return { channel: 'browser' }
    return { channel: 'result', url, reason: 'the browser could not be opened on this machine' }
  }
}

export type Presenter = ReturnType<typeof createPresenter>
