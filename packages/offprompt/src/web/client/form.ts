import { namedEmoji } from '../../core/emoji.js'
import { fingerprintOf } from '../../core/fingerprint.js'
import { encodeBytes } from '../../core/generated.js'
import { distribute } from './distribute.js'
import { watchConnection, type Connection } from './connection.js'
import {
  evaluate,
  fieldOf,
  filledFileOf,
  fitted,
  generateInto,
  isGenerated,
  isSingleLine,
  isValid,
  keyOf,
  markFilledFrom,
  toggleReveal,
  trimField,
  valueFields,
  writtenValues,
} from './field.js'
import {
  drawButton,
  drawDropping,
  drawFilled,
  drawFingerprint,
  drawLine,
  drawNotice,
  drawProgress,
  drawWriting,
  dropUndo,
} from './render.js'
import { plaintextFor, sealerFor, type Sealer } from './seal.js'
import { buttonFor, connectionLine, filledReport, noticeFor, type Blocker, type Counts } from './status.js'

/** A `.env` is a few kilobytes, and a PEM or a JSON document not much more. A file far past that is something else. */
const MAX_FILE_BYTES = 256 * 1024

/** A write that has not answered by now is taken as lost, and the page asks the status endpoint instead. */
const WRITE_TIMEOUT_MS = 30_000

const form = document.querySelector<HTMLFormElement>('form')

const submitButton = () => document.querySelector<HTMLButtonElement>('[data-submit]')

/** A remote request's form, whose values leave this page sealed. */
const sealedForm = () => document.querySelector<HTMLFormElement>('form[data-sealed]')

/** What a field held before the last paste or file filled it, for Undo. */
type Before = { readonly value: string; readonly made: string | undefined; readonly file: string | undefined }

/** Everything about the page that is not in its fields. */
const page: {
  /** Unknown until the status endpoint first answers. */
  connection: Connection | undefined
  writing: boolean
  /**
   * Set once this page posts its values, until the server answers that they were not
   * written. A request answered meanwhile was answered by this page, even if its answer
   * never arrived.
   */
  posted: boolean
  /** Set once the key in the link has been read. Until then a sealed form cannot write. */
  sealer: Sealer | undefined
  beforeFill: ReadonlyMap<HTMLTextAreaElement, Before> | undefined
  /** The file system refused the last write; the next is another go. */
  failed: boolean
  /** Asks the status endpoint at once, once the page is watching it. */
  pollNow: () => void
} = {
  connection: undefined,
  writing: false,
  posted: false,
  sealer: undefined,
  beforeFill: undefined,
  failed: false,
  pollNow: () => undefined,
}

const generatedRows = () => [...document.querySelectorAll<HTMLElement>('[data-generated]')]

/** Keys the file already holds are ready from the start: there is nothing to type for them. */
const countsNow = (): Counts => {
  const fields = valueFields()
  const kept = generatedRows().length
  return {
    total: fields.length + kept,
    ready: fields.filter(isValid).length + kept,
    failing: fields.filter(field => field.classList.contains('invalid')).length,
  }
}

const overrideTicked = () => form?.querySelector<HTMLInputElement>('input[name=allowTracked]')?.checked !== false

const blockerNow = (): Blocker => {
  if (page.writing) return 'writing'
  if (page.connection?.kind === 'closed') return 'closed'
  if (page.connection?.kind === 'lost') return 'lost'
  if (sealedForm() !== null && page.sealer === undefined) return 'unsealable'
  if (!overrideTicked()) return 'override'
  return undefined
}

/** Redraws everything that follows from the fields and the page's state: the button, the progress, the banners. */
const refresh = () => {
  const counts = countsNow()
  drawButton(buttonFor({ counts, blocker: blockerNow(), file: form?.dataset.file ?? 'the file', failed: page.failed }))
  drawProgress({ counts, writing: page.writing })
  if (page.connection === undefined) return
  const asker = form?.dataset.asker ?? 'the agent'
  const state = page.connection.kind === 'open' ? 'open' : page.connection.kind
  const ours = page.posted
  drawLine({ text: connectionLine({ connection: page.connection, asker, ours }), state })
  drawNotice(noticeFor({ connection: page.connection, remote: sealedForm() !== null, ours }))
}

/** A line under the import card for what a fill or a write could not do. Cleared by the next fill. */
const say = (message: string) => {
  const status = document.getElementById('fill-status')
  if (status !== null) status.textContent = message
}

/** Why a remote page cannot encrypt, kept apart so no fill clears it. */
const sayAboutSealing = (message: string) => {
  const status = document.getElementById('seal-status') ?? document.getElementById('fill-status')
  if (status !== null) status.textContent = message
}

/** Undo only puts back what a fill changed; once anything else changes a filled field, it is gone. */
const forgetFill = (field: HTMLTextAreaElement) => {
  if (page.beforeFill?.has(field) !== true) return
  page.beforeFill = undefined
  dropUndo()
}

/**
 * Fills every field the text names. A paste, an import and a drop all come through here,
 * so they read a block exactly alike. Nothing is sent until the human writes.
 */
const fillFrom = ({ text, source, file }: { text: string; source: string; file?: string }) => {
  const fields = valueFields()
  const result = distribute({ text, names: fields.map(keyOf) })
  if (result === undefined) return false
  const filled = fields.filter(field => result.fills.has(keyOf(field)))
  page.beforeFill = new Map(
    filled.map(field => [field, { value: field.value, made: field.dataset.made, file: filledFileOf(field) }]),
  )
  filled.forEach(field => {
    field.value = fitted({ field, value: result.fills.get(keyOf(field)) ?? '' })
    delete field.dataset.made
    markFilledFrom({ field, file })
    evaluate(field)
  })
  const kept = new Set(generatedRows().map(row => row.dataset.generated ?? ''))
  say('')
  drawFilled(
    filledReport({
      filled: filled.length,
      failing: filled.filter(field => field.classList.contains('invalid')).length,
      ignored: result.ignored.filter(name => !kept.has(name)),
      skipped: result.ignored.filter(name => kept.has(name)),
      source,
    }),
  )
  refresh()
  return true
}

/** Puts back what the fields held before the last fill, and where each value came from. */
const undoFill = () => {
  const before = page.beforeFill
  if (before === undefined) return
  before.forEach(({ value, made, file }, field) => {
    field.value = value
    if (made === undefined) delete field.dataset.made
    else field.dataset.made = made
    markFilledFrom({ field, file })
    evaluate(field)
  })
  page.beforeFill = undefined
  drawFilled(undefined)
  refresh()
  const [first] = before.keys()
  first?.focus()
}

/** A paste naming no requested key is an ordinary paste, and lands in the focused field. */
const onPaste = (event: ClipboardEvent) => {
  if (page.writing) return
  if (fillFrom({ text: event.clipboardData?.getData('text/plain') ?? '', source: 'your clipboard' })) {
    event.preventDefault()
  }
}

const readText = async (file: File) => {
  if (file.size > MAX_FILE_BYTES) {
    say(`${file.name} is too large to read here: over 256 KB.`)
    return undefined
  }
  return file.text()
}

/** A field's own file picker, or a drop onto it, puts the whole file into that field, so it can be checked first. */
const loadIntoField = async ({ file, field }: { file: File; field: HTMLTextAreaElement }) => {
  if (page.writing) return
  const text = await readText(file)
  if (text === undefined) return
  forgetFill(field)
  field.value = text.replace(/\r\n/g, '\n')
  delete field.dataset.made
  markFilledFrom({ field, file: file.name })
  evaluate(field)
  refresh()
}

/** The multi-line field under a point, or the page's only field when a request has one: where a whole file goes. */
const wholeFileField = ({ x, y }: { x: number; y: number }) => {
  const under = document.elementFromPoint(x, y)?.closest('.field')?.querySelector('textarea')
  if (under instanceof HTMLTextAreaElement && !isSingleLine(under)) return under
  const fields = valueFields()
  const [only] = fields
  return fields.length === 1 && only !== undefined && !isSingleLine(only) ? only : undefined
}

/**
 * A file read as a `.env` fills the fields it names. One that names none goes whole into the
 * multi-line field it was dropped on, such as a PEM, or it is said to name none.
 */
const importFile = async ({ file, at }: { file: File; at?: { x: number; y: number } }) => {
  const whole = at === undefined ? undefined : wholeFileField(at)
  if (whole !== undefined && document.querySelector('[data-drop]') === null) {
    await loadIntoField({ file, field: whole })
    return
  }
  const text = await readText(file)
  if (text === undefined) return
  if (fillFrom({ text, source: file.name, file: file.name })) return
  if (whole !== undefined) await loadIntoField({ file, field: whole })
  else say(`${file.name} names none of the keys this page asked for.`)
}

const onChange = (event: Event) => {
  const target = event.target
  if (!(target instanceof HTMLInputElement)) return
  if (target.name === 'allowTracked') {
    refresh()
    return
  }
  // The one switch decides for every field again, so no field keeps its own choice. It sets
  // each field too, for a browser whose stylesheet cannot follow the switch on its own.
  if (target.id === 'reveal-all') {
    valueFields()
      .filter(field => field.classList.contains('secret'))
      .forEach(field => field.classList.toggle('shown', target.checked))
    document.querySelectorAll('[data-reveal]').forEach(button => button.setAttribute('aria-pressed', String(target.checked)))
    return
  }
  if (target.type !== 'file') return
  const [file] = target.files ?? []
  // Cleared so choosing the same file again still fires a change.
  target.value = ''
  if (file === undefined) return
  if (target.id === 'import-file') {
    void importFile({ file })
    return
  }
  const field = document.getElementById(target.dataset.fills ?? '')
  if (field instanceof HTMLTextAreaElement) void loadIntoField({ file, field })
}

const onInput = (event: Event) => {
  const target = event.target
  if (!(target instanceof HTMLTextAreaElement) || target.dataset.key === undefined) return
  const value = fitted({ field: target, value: target.value })
  if (value !== target.value) target.value = value
  markFilledFrom({ field: target, file: undefined })
  delete target.dataset.made
  forgetFill(target)
  evaluate(target)
  refresh()
}

/** Leaving a field turns a value that was only short while typed into a wrong one. */
const onFocusOut = (event: FocusEvent) => {
  if (!(event.target instanceof HTMLTextAreaElement) || event.target.dataset.key === undefined) return
  evaluate(event.target)
  refresh()
}

/** Generate and Regenerate put a fresh value in their field; focus moves to whichever of them now shows. */
const regenerate = (button: HTMLButtonElement) => {
  const field = fieldOf(button)
  if (field === undefined) return
  forgetFill(field)
  generateInto(field)
  evaluate(field)
  refresh()
  if (button.hidden) field.closest('.input')?.querySelector<HTMLButtonElement>('[data-regenerate]')?.focus()
}

/** The buttons inside the page: a field's own eye, Generate and Regenerate, Trim, and Undo. */
const onClick = (event: MouseEvent) => {
  const button = event.target instanceof Element ? event.target.closest('button') : null
  if (button === null) return
  if (button.hasAttribute('data-reveal')) toggleReveal(button)
  if (button.hasAttribute('data-undo')) undoFill()
  if (button.hasAttribute('data-generate-new') || button.hasAttribute('data-regenerate')) regenerate(button)
  if (!button.hasAttribute('data-trim')) return
  const field = trimField(button)
  if (field === undefined) return
  forgetFill(field)
  evaluate(field)
  refresh()
  field.focus()
}

const carriesFiles = (event: DragEvent) => event.dataTransfer?.types.includes('Files') === true

/** A drop onto a field's own file picker is left to that picker. */
const aimedAtPicker = (event: DragEvent) =>
  event.target instanceof HTMLInputElement && event.target.type === 'file'

/**
 * How deep a drag is inside the page. Entering the overlay leaves the element under it, so
 * a count, rather than where a leave went, says when the drag has left the page.
 */
const drag = { depth: 0 }

/** The overlay says what a drop does on a page that takes `.env` files. */
const showsOverlay = () => document.querySelector('[data-drop]') !== null

const onDragEnter = (event: DragEvent) => {
  if (!carriesFiles(event)) return
  event.preventDefault()
  drag.depth += 1
  if (!page.writing && showsOverlay()) drawDropping(true)
}

/** Every file drag is taken, so a drop never opens the file in place of the page; while writing, it is refused. */
const onDragOver = (event: DragEvent) => {
  if (!carriesFiles(event)) return
  event.preventDefault()
  if (event.dataTransfer !== null) event.dataTransfer.dropEffect = page.writing ? 'none' : 'copy'
}

const onDragLeave = (event: DragEvent) => {
  if (!carriesFiles(event)) return
  drag.depth = Math.max(0, drag.depth - 1)
  if (drag.depth === 0) drawDropping(false)
}

const onDrop = (event: DragEvent) => {
  drag.depth = 0
  drawDropping(false)
  if (!carriesFiles(event) || aimedAtPicker(event)) return
  event.preventDefault()
  const [file] = event.dataTransfer?.files ?? []
  if (file === undefined || page.writing) return
  void importFile({ file, at: { x: event.clientX, y: event.clientY } })
}

const nonceOf = (sent: HTMLFormElement) => sent.querySelector<HTMLInputElement>('input[name=nonce]')?.value ?? ''

/**
 * A key made for one submission, which the page takes its fingerprint with and sends along
 * with the values. It is never on any page, so the four emoji tell no one about the values.
 */
const fingerprintKey = () => encodeBytes(crypto.getRandomValues(new Uint8Array(32)), 'base64url')

/** The nonce, each value, the override and the fingerprint key. A file picked for a field has already been read into it. */
const plainBodyFor = ({ sent, key }: { sent: HTMLFormElement; key: string }) =>
  new URLSearchParams([
    ['nonce', nonceOf(sent)],
    ...valueFields().map((field): [string, string] => [field.name, field.value]),
    ...(sent.querySelector<HTMLInputElement>('input[name=allowTracked]')?.checked === true
      ? [['allowTracked', 'yes'] as [string, string]]
      : []),
    ['fingerprint', key],
  ])

/** The same fields, sealed to the sandbox's key. Only the nonce stays in the clear. */
const sealedBodyFor = async ({ sent, sealer, key }: { sent: HTMLFormElement; sealer: Sealer; key: string }) => {
  const values = new Map(valueFields().map(field => [field.name, field.value]))
  const allowTracked = sent.querySelector<HTMLInputElement>('input[name=allowTracked]')?.checked === true
  const sealed = await sealer(plaintextFor({ values, allowTracked, fingerprint: key }))
  return new URLSearchParams([
    ['nonce', nonceOf(sent)],
    ['sealed', sealed],
  ])
}

const bodyFor = ({ sent, key }: { sent: HTMLFormElement; key: string }) =>
  page.sealer === undefined ? plainBodyFor({ sent, key }) : sealedBodyFor({ sent, sealer: page.sealer, key })

/** What a page the server answers with brings: its top bar and its body. */
const SWAPPED = ['header.topbar', 'main']

/** Swaps in the page the server answered with: the written page, or a closed one. */
const showPage = (next: Document) => {
  SWAPPED.forEach(selector => {
    const incoming = next.querySelector(selector)
    const current = document.querySelector(selector)
    if (incoming !== null && current !== null) current.replaceWith(document.importNode(incoming, true))
  })
  document.title = next.title
}

/** Controls that need this script arrive hidden; one the server sends later is shown as it lands. */
const revealScripted = (root: ParentNode) =>
  root.querySelectorAll('[data-needs-script]').forEach(element => element.removeAttribute('hidden'))

/**
 * A rejected submission redraws only its rule lines and any form-level box, keeping every
 * value typed. A field the server passed is drawn from its value again; one it failed keeps
 * the server's lines, which are what the server will hold it to.
 */
const showProblems = (next: Document) => {
  next.querySelectorAll('ul.rules').forEach(list => {
    document.getElementById(list.id)?.replaceWith(document.importNode(list, true))
  })
  valueFields().forEach(field => {
    const invalid = next.getElementById(field.id)?.classList.contains('invalid') === true
    if (!invalid) {
      evaluate(field)
      return
    }
    field.classList.add('invalid')
    field.classList.remove('valid')
    const summary = field.closest('.field')?.querySelector<HTMLElement>('[data-summary]')
    if (summary !== null && summary !== undefined) summary.hidden = true
  })
  document.querySelector('.error')?.remove()
  // The server says afresh whether the file can be written.
  const state = next.querySelector('.target .state')
  if (state !== null) document.querySelector('.target .state')?.replaceWith(document.importNode(state, true))
  const error = next.querySelector('.error')
  if (error === null) return
  const imported = document.importNode(error, true)
  revealScripted(imported)
  submitButton()?.before(imported)
}

/** Where the human's attention goes after a rejected write: the problem by the button, or the first field to fix. */
const focusProblem = () => {
  const target = document.querySelector<HTMLElement>('.error') ?? valueFields().find(field => field.classList.contains('invalid'))
  target?.focus()
}

/**
 * The fingerprint of the values as the server will write them, taken here from what was
 * typed, before anything leaves the page. A browser without WebCrypto shows the server's.
 */
const ownFingerprint = (key: string) => fingerprintOf({ key, values: writtenValues() }).catch(() => undefined)

const setWriting = (writing: boolean) => {
  page.writing = writing
  drawWriting(writing)
  refresh()
}

/** The written page, with the page's own fingerprint and what it lets the human check. */
const showWritten = ({ next, fingerprint }: { next: Document; fingerprint: string | undefined }) => {
  showPage(next)
  const main = document.querySelector('main')
  if (fingerprint !== undefined && main !== null) {
    revealScripted(main)
    drawFingerprint(namedEmoji(fingerprint))
  }
  document.querySelector<HTMLElement>('main h1')?.focus()
}

/**
 * A write whose outcome the page cannot tell: no answer in time, or an answer that is not
 * offprompt's, such as a tunnel's error page. The values stay, and the page asks the status
 * endpoint whether they were written.
 */
const writeUnanswered = (why: string) => {
  setWriting(false)
  say(`${why} This page is checking whether the values were written.`)
  page.pollNow()
}

/**
 * Posts the values from the page, so a rejected value redraws only its rule lines and
 * everything typed stays where it was. Only an answer that is one of offprompt's own pages
 * settles the write.
 */
const write = async () => {
  const submit = submitButton()
  if (form === null || submit === null || submit.disabled) return
  const key = fingerprintKey()
  setWriting(true)
  page.posted = true
  const fingerprint = await ownFingerprint(key)
  const answer = await fetch(form.action, {
    method: 'POST',
    body: await bodyFor({ sent: form, key }),
    credentials: 'omit',
    signal: AbortSignal.timeout(WRITE_TIMEOUT_MS),
  })
    .then(async response => ({ response, next: new DOMParser().parseFromString(await response.text(), 'text/html') }))
    .catch(() => undefined)
  if (answer === undefined) {
    writeUnanswered('offprompt did not answer.')
    return
  }
  const kind = answer.next.querySelector('main[data-page]')?.getAttribute('data-page')
  if (kind === 'form') {
    page.posted = false
    page.failed = answer.next.querySelector('[data-write-failed]') !== null
    setWriting(false)
    showProblems(answer.next)
    refresh()
    focusProblem()
    return
  }
  if (kind === 'written' || kind === 'closed') {
    form.dispatchEvent(new Event('offprompt:written'))
    if (kind === 'written') showWritten({ next: answer.next, fingerprint })
    else showPage(answer.next)
    return
  }
  writeUnanswered(`Something other than offprompt answered (HTTP ${String(answer.response.status)}).`)
}

/**
 * Enter in a single-line field writes, as it would in a text input, rather than starting a
 * line; ⌘ or Ctrl with Enter writes from anywhere. An Enter that commits an input method's
 * composition is the input method's.
 */
const onKeyDown = (event: KeyboardEvent) => {
  if (event.key !== 'Enter' || event.isComposing || event.keyCode === 229) return
  const target = event.target
  const fromField = target instanceof HTMLTextAreaElement && isSingleLine(target)
  if (!fromField && !event.metaKey && !event.ctrlKey) return
  event.preventDefault()
  void write()
}

/** Reads the key from the link once. A page that cannot seal says why and keeps the button off. */
const prepareSealing = async (sealed: HTMLFormElement) => {
  const token = new URL(sealed.action).pathname.split('/').pop() ?? ''
  const sealer = await sealerFor({ hash: location.hash, token, nonce: nonceOf(sealed) })
  if (typeof sealer === 'string') {
    sayAboutSealing(sealer)
    return
  }
  page.sealer = sealer
  refresh()
}

/** Keeps the page true about the request until it moves on. */
const watchForm = (watched: HTMLFormElement) => {
  const watching = watchConnection({
    statusUrl: `${watched.action}/status`,
    onChange: connection => {
      page.connection = connection
      refresh()
    },
  })
  page.pollNow = watching.pollNow
  watched.addEventListener('offprompt:written', () => watching.stop(), { once: true })
}

// With this script off, the form submits natively instead.
submitButton()?.setAttribute('type', 'button')
submitButton()?.addEventListener('click', () => void write())
form?.addEventListener('submit', event => event.preventDefault())

const remote = sealedForm()
if (remote !== null) void prepareSealing(remote)
if (form !== null) watchForm(form)

// Controls that only work with this script are rendered hidden, so a page without it
// never shows a button that does nothing.
revealScripted(document)

// The page is written with the Mac's shortcuts; anywhere else they take Ctrl.
if (!/Mac|iPhone|iPad/.test(navigator.userAgent)) {
  document.querySelectorAll<HTMLElement>('kbd[data-shortcut]').forEach(key => {
    key.textContent = `Ctrl ${key.dataset.shortcut ?? ''}`
  })
}

// A generated key is made here as the page opens, from this browser's random bytes. Its
// field still takes one the human pastes instead.
valueFields()
  .filter(isGenerated)
  .forEach(field => {
    field.placeholder = 'paste one, or'
    if (field.value === '') generateInto(field)
  })

// A field the server already flagged keeps its lines until the human changes it.
valueFields()
  .filter(field => field.value !== '' || isGenerated(field))
  .forEach(evaluate)
refresh()

document.addEventListener('keydown', onKeyDown)
document.addEventListener('paste', onPaste)
document.addEventListener('change', onChange)
document.addEventListener('input', onInput)
document.addEventListener('focusout', onFocusOut)
document.addEventListener('click', onClick)
document.addEventListener('dragenter', onDragEnter)
document.addEventListener('dragover', onDragOver)
document.addEventListener('dragleave', onDragLeave)
document.addEventListener('drop', onDrop)
