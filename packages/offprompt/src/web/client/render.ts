import type { ButtonLook, Counts, Notice } from './status.js'
import { progressFor } from './status.js'

/**
 * Writes text only when it changes. The page redraws on every blur, and WebKit drops a
 * click whose mousedown landed on a text node that was replaced before the mouseup, even
 * by the same words.
 */
export const setText = (element: Element | null | undefined, text: string) => {
  if (element !== null && element !== undefined && element.textContent !== text) element.textContent = text
}

/** The write button: its words, whether it can be pressed, and whether it turns. */
export const drawButton = (look: ButtonLook) => {
  const button = document.querySelector<HTMLButtonElement>('[data-submit]')
  if (button === null) return
  button.disabled = look.disabled
  button.classList.toggle('busy', look.busy)
  button.classList.toggle('waiting', look.icon === 'loader-circle')
  button.classList.toggle('retry', look.icon === 'rotate-ccw')
  setText(button.querySelector('[data-label]'), look.label)
}

/** The bar and the words above the button. */
export const drawProgress = ({ counts, writing }: { counts: Counts; writing: boolean }) => {
  const progress = progressFor({ counts, writing })
  const fill = document.querySelector<HTMLElement>('.bar-fill')
  if (fill !== null) fill.style.width = `${String(counts.total === 0 ? 0 : (counts.ready / counts.total) * 100)}%`
  setText(document.querySelector('[data-ready]'), progress.ready)
  const note = document.querySelector<HTMLElement>('[data-progress-note]')
  if (note === null) return
  setText(note, progress.note)
  note.classList.toggle('bad', progress.bad)
}

/** The line in the top bar. */
export const drawLine = ({ text, state }: { text: string; state: 'open' | 'lost' | 'closed' }) => {
  const line = document.getElementById('connection')
  if (line === null) return
  line.hidden = false
  setText(line, text)
  line.dataset.state = state
}

/** The banner for a server that went away or a request that closed, in the import card's place. */
export const drawNotice = (notice: Notice | undefined) => {
  const banner = document.getElementById('page-notice')
  if (banner === null) return
  banner.hidden = notice === undefined
  if (notice === undefined) return
  banner.classList.toggle('warn', notice.tone === 'warn')
  banner.classList.toggle('bad', notice.tone === 'bad')
  banner.classList.toggle('ok', notice.tone === 'ok')
  const [title, body] = banner.querySelectorAll('p')
  setText(title, notice.title)
  setText(body, notice.body)
}

/** The banner that takes the import card's place once a paste or a file filled the fields. */
export const drawFilled = (report: { title: string; body: string } | undefined) => {
  const banner = document.querySelector<HTMLElement>('[data-filled]')
  const card = document.querySelector<HTMLElement>('section.import:not([data-filled])')
  if (banner === null || card === null) return
  banner.hidden = report === undefined
  card.hidden = report !== undefined
  if (report === undefined) return
  setText(banner.querySelector('[data-filled-title]'), report.title)
  setText(banner.querySelector('[data-filled-body]'), report.body)
  const undo = banner.querySelector<HTMLElement>('[data-undo]')
  if (undo !== null) undo.hidden = false
}

/** Once the human has typed over what a fill put in, going back to before it would undo their typing too. */
export const dropUndo = () => {
  const undo = document.querySelector<HTMLElement>('[data-undo]')
  if (undo !== null) undo.hidden = true
}

/** While the values are on their way, the fields hold still and a replaced key says it is being replaced. */
export const drawWriting = (writing: boolean) => {
  document.querySelector('form')?.classList.toggle('writing', writing)
  document.querySelectorAll<HTMLTextAreaElement>('textarea[data-key]').forEach(field => {
    field.readOnly = writing
  })
  document.querySelectorAll<HTMLInputElement>('input[type=file]').forEach(picker => {
    picker.disabled = writing
  })
  document.querySelectorAll<HTMLElement>('[data-writing]').forEach(line => {
    if (line.dataset.idle === undefined) line.dataset.idle = line.textContent
    setText(line, (writing ? line.dataset.writing : line.dataset.idle) ?? '')
  })
}

/**
 * The page's own fingerprint on the written page. It stands unless the server's, taken from
 * the file, differs: then the page shows its own four and says the file holds something else.
 */
export const drawFingerprint = (own: readonly { glyph: string; name: string }[]) => {
  const list = document.querySelector<HTMLElement>('ul.emoji')
  const glyphs = own.map(({ glyph }) => glyph).join(' ')
  if (list === null || list.getAttribute('aria-label') === glyphs) return
  list.setAttribute('aria-label', glyphs)
  list.querySelectorAll('li').forEach((tile, index) => {
    setText(tile.querySelector('.glyph'), own[index]?.glyph ?? '')
    setText(tile.querySelector('.name'), own[index]?.name ?? '')
  })
  const mismatch = document.querySelector<HTMLElement>('[data-mismatch]')
  if (mismatch !== null) mismatch.hidden = false
}

/** The overlay that says what dropping a file will do. */
export const drawDropping = (dropping: boolean) => {
  const overlay = document.querySelector<HTMLElement>('[data-drop]')
  if (overlay !== null) overlay.hidden = !dropping
}
