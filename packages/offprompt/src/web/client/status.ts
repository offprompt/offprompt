import { clock, type Connection } from './connection.js'

const plural = (count: number, word: string) => `${String(count)} ${word}${count === 1 ? '' : 's'}`

/** "A", "A and B", "A, B and C". */
const listed = (names: readonly string[]) =>
  names.length <= 1 ? (names[0] ?? '') : `${names.slice(0, -1).join(', ')} and ${names.at(-1) ?? ''}`

/** How far along the fields are. */
export type Counts = { readonly total: number; readonly ready: number; readonly failing: number }

/** Why the page cannot write yet, beyond the fields themselves. */
export type Blocker = 'closed' | 'lost' | 'writing' | 'unsealable' | 'override' | undefined

export type ButtonLook = {
  readonly label: string
  readonly icon: 'file-input' | 'loader-circle' | 'rotate-ccw'
  readonly disabled: boolean
  /** Writing: the button stays dark and turns. */
  readonly busy: boolean
}

/** What the write button says and whether it can be pressed. After a failed write, it offers another go. */
export const buttonFor = ({
  counts,
  blocker,
  file,
  failed = false,
}: {
  counts: Counts
  blocker: Blocker
  file: string
  failed?: boolean
}): ButtonLook => {
  const off = (label: string): ButtonLook => ({ label, icon: 'file-input', disabled: true, busy: false })
  if (blocker === 'writing') return { label: `Writing to ${file}…`, icon: 'loader-circle', disabled: true, busy: true }
  if (blocker === 'closed') return off('This request is closed')
  if (blocker === 'lost') return { label: 'Waiting for offprompt…', icon: 'loader-circle', disabled: true, busy: false }
  if (counts.failing > 0) return off(`Fix ${plural(counts.failing, 'value')} to write`)
  if (counts.ready < counts.total) return off(`Fill ${plural(counts.total - counts.ready, 'value')} to write`)
  if (blocker === 'unsealable') return off("This page can't encrypt the values")
  if (blocker === 'override') return off('Tick the box above to write')
  if (failed) return { label: 'Try again', icon: 'rotate-ccw', disabled: false, busy: false }
  return { label: `Write to ${file}`, icon: 'file-input', disabled: false, busy: false }
}

/** The words beside the progress bar: how many are ready, and what is wrong or under way. */
export const progressFor = ({ counts, writing }: { counts: Counts; writing: boolean }) => ({
  ready: `${String(counts.ready)} of ${String(counts.total)} ready`,
  note: writing ? 'Writing…' : counts.failing > 0 ? `${String(counts.failing)} ${counts.failing === 1 ? 'needs' : 'need'} a fix` : '',
  bad: !writing && counts.failing > 0,
})

/**
 * The line in the top bar. `ours` is set once this page has posted its values: a request
 * answered after that was answered by this page, even if its answer never arrived.
 */
export const connectionLine = ({ connection, asker, ours = false }: { connection: Connection; asker: string; ours?: boolean }) => {
  if (connection.kind === 'open') return `Connected to ${asker} · ${clock(connection.secondsLeft)} left`
  if (connection.kind === 'lost') return 'Reconnecting to offprompt…'
  if (connection.reason === 'expired') return 'Expired'
  return ours ? 'Written' : 'Answered elsewhere'
}

/** A banner for a request the page can no longer write to, or cannot reach. */
export type Notice = {
  readonly tone: 'warn' | 'bad' | 'ok'
  readonly title: string
  readonly body: string
}

export const noticeFor = ({
  connection,
  remote,
  ours = false,
}: {
  connection: Connection
  remote: boolean
  ours?: boolean
}): Notice | undefined => {
  if (connection.kind === 'open') return undefined
  if (connection.kind === 'lost') {
    return {
      tone: 'warn',
      title: 'Lost the connection to offprompt',
      body: `${remote ? "The agent's sandbox" : 'The local server'} stopped answering. Your values stay on this page, and nothing is written until it is back.`,
    }
  }
  if (connection.reason === 'expired') {
    return { tone: 'bad', title: 'This request has expired', body: 'Ask the agent to request the values again.' }
  }
  return ours
    ? {
        tone: 'ok',
        title: 'Your values were written',
        body: "offprompt wrote them and told the agent, but this page missed its answer. There's nothing more to do here.",
      }
    : {
        tone: 'bad',
        title: 'This request has already been answered',
        body: 'If that was not you, tell the agent. Nothing typed here will be written.',
      }
}

/** What a paste or a file filled, said in the banner that takes the import card's place. */
export const filledReport = ({
  filled,
  failing,
  ignored,
  skipped,
  source,
}: {
  filled: number
  failing: number
  ignored: readonly string[]
  skipped: readonly string[]
  /** "your clipboard", or the file's name. */
  source: string
}) => {
  const fromPaste = source === 'your clipboard'
  const fixes = failing === 0 ? '' : `${plural(failing, 'value')} ${failing === 1 ? 'needs' : 'need'} a fix.`
  const many = ignored.length > 1
  const ignoredLine =
    ignored.length === 0
      ? ''
      : `${listed(ignored)} ${many ? 'were' : 'was'} in the ${fromPaste ? 'paste' : 'file'} but ${
          many ? "weren't" : "wasn't"
        } asked for, so ${many ? 'they were' : 'it was'} skipped.`
  const skippedLine =
    skipped.length === 0
      ? ''
      : `${listed(skipped)} ${skipped.length > 1 ? 'are' : 'is'} already set and kept, so the ${
          fromPaste ? 'pasted' : 'imported'
        } value was left out.`
  const body = [fixes, ignoredLine, skippedLine].filter(line => line !== '').join(' ')
  return {
    title: `Filled ${plural(filled, 'field')} from ${source}`,
    body: body === '' ? 'Each value is in its field.' : body,
  }
}
