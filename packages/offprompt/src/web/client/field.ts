import { asWritten } from '../../core/as-written.js'
import { ENCODINGS, encodeBytes, type Encoding } from '../../core/generated.js'
import { checkField, isFieldRule, type FieldRule } from '../../core/rules.js'
import { hintFor, lineFor, spaceNote, type KnownKey, type Line } from './lines.js'
import { setText } from './render.js'

export const valueFields = () => [...document.querySelectorAll<HTMLTextAreaElement>('textarea[data-key]')]

export const keyOf = (field: HTMLTextAreaElement) => field.dataset.key ?? ''

export const isSingleLine = (field: HTMLTextAreaElement) => field.hasAttribute('data-single-line')

/** Each field's key and its value as the file will hold it: what the fingerprint is taken over. */
export const writtenValues = () =>
  valueFields().map(
    field => [keyOf(field), asWritten({ name: keyOf(field), value: field.value, multiline: !isSingleLine(field) })] as const,
  )

/** A single-line field drops line breaks, as a text input would, so a key copied with its newline fits. */
export const fitted = ({ field, value }: { field: HTMLTextAreaElement; value: string }) =>
  isSingleLine(field) ? value.replace(/[\r\n]/g, '') : value

const isUnknownArray = (value: unknown): value is readonly unknown[] => Array.isArray(value)

const parsed = (text: string | undefined): unknown => JSON.parse(text ?? '[]')

/** The rules the server checks this field against, handed over on the field itself. */
const rulesOf = (field: HTMLTextAreaElement): readonly FieldRule[] => {
  const rules = parsed(field.dataset.rules)
  return isUnknownArray(rules) ? rules.filter(isFieldRule) : []
}

const isKnownKey = (value: unknown): value is KnownKey =>
  typeof value === 'object' &&
  value !== null &&
  'ref' in value &&
  typeof value.ref === 'string' &&
  'provider' in value &&
  typeof value.provider === 'string' &&
  'label' in value &&
  typeof value.label === 'string' &&
  'url' in value &&
  typeof value.url === 'string' &&
  'prefixes' in value &&
  isUnknownArray(value.prefixes) &&
  value.prefixes.every(prefix => typeof prefix === 'string')

/** Every provider key the page knows by prefix, handed over on the form. */
const knownKeys = (() => {
  const keys = parsed(document.querySelector<HTMLFormElement>('form[data-known]')?.dataset.known)
  return isUnknownArray(keys) ? keys.filter(isKnownKey) : []
})()

const knownPrefixes = knownKeys.flatMap(key => key.prefixes)

export const isValid = (field: HTMLTextAreaElement) => field.value !== '' && checkField(rulesOf(field), field.value).every(Boolean)

/** The file each field was last filled from, until the human changes it by hand. */
const filledFrom = new WeakMap<HTMLTextAreaElement, string>()

export const markFilledFrom = ({ field, file }: { field: HTMLTextAreaElement; file: string | undefined }) => {
  if (file === undefined) filledFrom.delete(field)
  else filledFrom.set(field, file)
}

export const filledFileOf = (field: HTMLTextAreaElement) => filledFrom.get(field)

const lowerFirst = (text: string) => `${text.charAt(0).toLowerCase()}${text.slice(1)}`

/** One rule's line: its state, and what it adds after its message. */
const drawLine = ({ line, result }: { line: HTMLElement; result: Line | undefined }) => {
  const state = result?.state ?? 'idle'
  line.classList.toggle('pass', state === 'pass')
  line.classList.toggle('fail', state === 'fail')
  line.classList.toggle('pending', state === 'pending')
  if (line.hasAttribute('data-quiet')) line.hidden = state !== 'fail'
  const detail = result?.detail ?? ''
  const existing = line.querySelector<HTMLElement>('.detail')
  const message = line.querySelector<HTMLElement>(':scope > span')
  if (detail === '' || message === null) {
    existing?.remove()
    return
  }
  // Inside the message, so it reads on as part of the same line.
  const span = existing ?? message.appendChild(document.createElement('span'))
  span.className = 'detail'
  setText(span, ` · ${detail}`)
}

/** The one line that stands in for every rule once they all pass. */
const drawSummary = ({ box, field, valid }: { box: Element; field: HTMLTextAreaElement; valid: boolean }) => {
  const summary = box.querySelector<HTMLElement>('[data-summary]')
  const text = summary?.querySelector<HTMLElement>('[data-said]')
  if (summary === null || text === null || text === undefined) return false
  const made = field.dataset.made === 'page' ? text.dataset.made : undefined
  const said = made ?? text.dataset.said ?? ''
  const file = filledFrom.get(field)
  summary.hidden = !valid
  summary.classList.toggle('from-file', file !== undefined)
  setText(text, file === undefined ? said : `Matched from ${file} · ${lowerFirst(said)}`)
  return true
}

const show = ({ element, text }: { element: HTMLElement | null; text: string }) => {
  if (element === null) return
  element.hidden = text === ''
  setText(element.querySelector('span') ?? element, text)
}

/**
 * Redraws one field from its value: each rule's line, the summary once every rule passes,
 * the key a wrong value looks like, and spaces at either end. While the field has focus a
 * value that is only short, or only part of the way into its prefix, is not yet wrong.
 * Returns whether the field can be written.
 */
export const evaluate = (field: HTMLTextAreaElement) => {
  const typing = document.activeElement === field
  const lines = rulesOf(field).map(rule => lineFor({ rule, value: field.value, typing, known: knownPrefixes }))
  const list = document.getElementById(`${field.id}-rules`)
  list?.querySelectorAll<HTMLElement>('li').forEach(line => {
    if (line.hasAttribute('data-required')) line.remove()
    else drawLine({ line, result: lines[Number(line.dataset.rule)] })
  })
  const valid = isValid(field)
  const failing = lines.some(line => line.state === 'fail')
  field.classList.toggle('valid', valid)
  field.classList.toggle('invalid', failing)
  field.toggleAttribute('aria-invalid', failing)

  const box = field.closest('.field')
  if (box === null) return valid
  if (drawSummary({ box, field, valid }) && list !== null) list.hidden = valid
  // Said as soon as a value that is not yet right starts like another key, rather than only
  // once it fails on blur, so the page does not shift under a click that caused the blur.
  const own = knownKeys.find(key => key.ref === field.dataset.source)
  show({
    element: box.querySelector<HTMLElement>('[data-hint]'),
    text: !valid && field.value !== '' ? hintFor({ value: field.value, own, known: knownKeys }) : '',
  })
  const spaces = isSingleLine(field) ? spaceNote(field.value) : ''
  show({ element: box.querySelector<HTMLElement>('[data-space]'), text: spaces })
  field.classList.toggle('spaced', spaces !== '')
  const trim = box.querySelector<HTMLElement>('[data-trim]')
  if (trim !== null) trim.hidden = spaces === ''
  const empty = field.value === ''
  const generate = box.querySelector<HTMLElement>('[data-generate-new]')
  if (generate !== null) generate.hidden = !empty
  const regenerate = box.querySelector<HTMLElement>('[data-regenerate]')
  if (regenerate !== null) regenerate.hidden = empty
  const generateHint = box.querySelector<HTMLElement>('[data-generate-hint]')
  if (generateHint !== null) generateHint.hidden = !empty
  const unchecked = box.querySelector<HTMLElement>('[data-unchecked]')
  if (unchecked !== null) setText(unchecked, (field.value === '' ? unchecked.dataset.empty : unchecked.dataset.filled) ?? '')
  return valid
}

/** A secret field's own eye. With every value shown, it hides only its own and keeps the rest shown. */
export const toggleReveal = (button: HTMLButtonElement) => {
  const field = button.closest('.input')?.querySelector('textarea')
  if (field === null || field === undefined) return
  const all = document.querySelector<HTMLInputElement>('#reveal-all')
  if (all?.checked === true) {
    all.checked = false
    valueFields()
      .filter(other => other.classList.contains('secret'))
      .forEach(other => other.classList.toggle('shown', other !== field))
  } else {
    field.classList.toggle('shown')
  }
  document.querySelectorAll<HTMLButtonElement>('[data-reveal]').forEach(each => {
    const shown = each.closest('.input')?.querySelector('textarea')?.classList.contains('shown') === true
    each.setAttribute('aria-pressed', String(shown))
  })
}

/** Cuts the spaces off both ends of the field the button belongs to. */
export const trimField = (button: HTMLButtonElement) => {
  const field = button.closest('.input')?.querySelector('textarea')
  if (field === null || field === undefined) return undefined
  field.value = field.value.trim()
  return field
}

const isEncoding = (value: unknown): value is Encoding => ENCODINGS.some(encoding => encoding === value)

/** How many random bytes a generated field wants, and how they are written, handed over on the field. */
const generateSpec = (field: HTMLTextAreaElement) => {
  const spec: unknown = JSON.parse(field.dataset.generate ?? 'null')
  if (typeof spec !== 'object' || spec === null || !('bytes' in spec) || !('encoding' in spec)) return undefined
  const { bytes, encoding } = spec
  return typeof bytes === 'number' && isEncoding(encoding) ? { bytes, encoding } : undefined
}

export const isGenerated = (field: HTMLTextAreaElement) => field.dataset.generate !== undefined

/** Puts a fresh value in a generated field, from this browser's random bytes. */
export const generateInto = (field: HTMLTextAreaElement) => {
  const spec = generateSpec(field)
  if (spec === undefined) return
  field.value = encodeBytes(crypto.getRandomValues(new Uint8Array(spec.bytes)), spec.encoding)
  field.dataset.made = 'page'
  markFilledFrom({ field, file: undefined })
}

/** The field a button inside its input belongs to. */
export const fieldOf = (button: HTMLButtonElement) => button.closest('.input')?.querySelector('textarea') ?? undefined
