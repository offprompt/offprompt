import { writeFile } from 'node:fs/promises'

/** How long the server waits with nothing open and nothing asked of it before it may be stopped. */
export const IDLE_MS = 5 * 60_000

/** How often the server looks again, as a request it holds may lapse on its own. */
const CHECK_EVERY_MS = 15_000

/**
 * Tells the launcher in front of the server whether it may stop the server: "stop" in the file
 * the launcher named, once no tool call is under way, no request is open, and none has come for
 * `idleMs`; "run" otherwise. The launcher starts the server again on the next call.
 */
export const createIdleReport = ({
  file,
  open,
  idleMs = IDLE_MS,
  clock = Date.now,
}: {
  file: string
  /** How many requests are still open, each waiting for its values. */
  open: () => number
  idleMs?: number
  clock?: () => number
}) => {
  const state = { calls: 0, last: clock(), said: '', writing: Promise.resolve() }

  /** Writes the word when it changes, one write after another, so the file never holds an older one. */
  const say = (word: 'run' | 'stop') => {
    if (word === state.said) return
    state.said = word
    state.writing = state.writing.then(() => writeFile(file, word)).catch(() => undefined)
  }

  const check = () => say(state.calls === 0 && open() === 0 && clock() - state.last >= idleMs ? 'stop' : 'run')

  setInterval(check, Math.min(CHECK_EVERY_MS, Math.max(idleMs / 2, 100))).unref()
  check()

  return {
    /** Runs one tool call, the server counting as busy until it returns. */
    during: async <T>(work: () => Promise<T>) => {
      state.calls += 1
      state.last = clock()
      say('run')
      try {
        return await work()
      } finally {
        state.calls -= 1
        state.last = clock()
      }
    },
    /** Whatever the file says now, once it is written. */
    settled: () => state.writing,
    check,
  }
}

export type IdleReport = ReturnType<typeof createIdleReport>

/** A tool call as it runs with no launcher to tell. */
export const unreported = <T>(work: () => Promise<T>) => work()
