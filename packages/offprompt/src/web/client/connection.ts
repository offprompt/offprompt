/** What the request's status endpoint answers. */
type Status = { readonly status: 'awaiting' | 'written' | 'expired'; readonly expiresIn: number }

/** Where the request stands as far as the page can tell. */
export type Connection =
  | { readonly kind: 'open'; readonly secondsLeft: number }
  | { readonly kind: 'lost' }
  | { readonly kind: 'closed'; readonly reason: 'answered' | 'expired' }

const POLL_EVERY_MS = 10_000

/** A status check that has not answered by now counts as no answer. */
const POLL_TIMEOUT_MS = 8_000

const TICK_MS = 1_000

const isStatus = (value: unknown): value is Status =>
  typeof value === 'object' &&
  value !== null &&
  'status' in value &&
  typeof value.status === 'string' &&
  ['awaiting', 'written', 'expired'].includes(value.status) &&
  'expiresIn' in value &&
  typeof value.expiresIn === 'number'

export const clock = (seconds: number) => {
  const whole = Math.max(0, Math.floor(seconds))
  return `${String(Math.floor(whole / 60))}:${String(whole % 60).padStart(2, '0')}`
}

/**
 * Keeps the page true about the request: whether the agent's side still answers, how long
 * the request has left, and, the moment anyone else answers the link, that it is gone.
 * `onChange` hears every change and every second the request stays open; a closed request
 * is reported once, and then nothing more. A check that hangs counts as no answer, and only
 * one is out at a time. `pollNow` asks at once, for a page that has just lost track.
 */
export const watchConnection = ({
  statusUrl,
  onChange,
  fetchStatus = url => fetch(url, { credentials: 'omit', cache: 'no-store', signal: AbortSignal.timeout(POLL_TIMEOUT_MS) }),
  pollEveryMs = POLL_EVERY_MS,
  tickMs = TICK_MS,
}: {
  statusUrl: string
  onChange: (connection: Connection) => void
  fetchStatus?: (url: string) => Promise<Response>
  pollEveryMs?: number
  tickMs?: number
}) => {
  const state: { expiresAt: number; lost: boolean; closed: boolean; asking: boolean; timers: number[] } = {
    expiresAt: 0,
    lost: false,
    closed: false,
    asking: false,
    timers: [],
  }

  const stop = () => state.timers.forEach(timer => clearInterval(timer))

  const close = (reason: 'answered' | 'expired') => {
    if (state.closed) return
    state.closed = true
    stop()
    onChange({ kind: 'closed', reason })
  }

  const tick = () => {
    if (state.closed || state.lost || state.expiresAt === 0) return
    const left = (state.expiresAt - Date.now()) / 1000
    if (left <= 0) close('expired')
    else onChange({ kind: 'open', secondsLeft: left })
  }

  const poll = async () => {
    if (state.closed || state.asking) return
    state.asking = true
    const status: unknown = await fetchStatus(statusUrl)
      .then((response): Promise<unknown> => (response.ok ? response.json() : Promise.resolve(undefined)))
      .catch(() => undefined)
    state.asking = false
    if (state.closed) return
    if (!isStatus(status)) {
      state.lost = true
      onChange({ kind: 'lost' })
      return
    }
    state.lost = false
    if (status.status === 'written') close('answered')
    else if (status.status === 'expired') close('expired')
    else {
      state.expiresAt = Date.now() + status.expiresIn * 1000
      onChange({ kind: 'open', secondsLeft: status.expiresIn })
    }
  }

  void poll()
  state.timers.push(window.setInterval(() => void poll(), pollEveryMs), window.setInterval(tick, tickMs))
  return { stop, pollNow: () => void poll() }
}
