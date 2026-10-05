/**
 * The stand-in for offprompt's server on a page people can try, as offprompt.dev and its
 * docs show it. It runs before the page's own script and answers what the page asks the
 * server: its status checks as an open request, and its write with the Written page. That
 * page carries the fingerprint of the same key and values the page takes its own four from,
 * so the two agree as they would after a real write. Nothing leaves the page.
 *
 * The site around it can fill the example values, paste a key where another belongs, have
 * the file hold something else, or pick the one field it shows, by messages to this frame.
 */
import { namedEmoji, emojiFrom } from '../../core/emoji.js'
import { fingerprintOf } from '../../core/fingerprint.js'
import { valueFields, writtenValues } from '../client/field.js'

type Values = readonly (readonly [string, string])[]

export type DemoConfig = {
  /** The Written page for the request, rendered with any four; a write puts its own in. */
  readonly written: string
  /** How long the request says it has, in seconds. Its clock goes round rather than running out. */
  readonly ttl: number
  /** The values Fill with examples puts in, as a file of them would. */
  readonly examples?: Values
  /** A key pasted where another belongs. */
  readonly mixUp?: { readonly key: string; readonly value: string }
  /** Values in the fields from the start, as though typed, so the page's checks have run on them. */
  readonly filled?: Values
  /** One field shown at a time: the first, until the site around the frame picks another. */
  readonly single?: boolean
}

/**
 * What the site around the frame can ask of it. `measure` asks how tall the page is, for a
 * site that starts listening after the frame first said.
 */
export type DemoMessage =
  | { readonly offprompt: 'fill' }
  | { readonly offprompt: 'mix-up' }
  | { readonly offprompt: 'mismatch'; readonly on: boolean }
  | { readonly offprompt: 'show'; readonly key: string }
  | { readonly offprompt: 'measure' }

/**
 * What the frame tells the site: the values were written; a field holds a value of the
 * person's own rather than an example, which may be a real key; or how tall the page is now,
 * so the frame can fit it.
 */
export type DemoReport =
  | { readonly offprompt: 'written' }
  | { readonly offprompt: 'own-value' }
  | { readonly offprompt: 'height'; readonly px: number }

/** A value this long that is none of the demo's own may be someone's real key. */
const OWN_VALUE_LENGTH = 16

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === 'object' && value !== null

const isDemoMessage = (value: unknown): value is DemoMessage =>
  isRecord(value) &&
  (value.offprompt === 'fill' ||
    value.offprompt === 'mix-up' ||
    value.offprompt === 'measure' ||
    (value.offprompt === 'mismatch' && typeof value.on === 'boolean') ||
    (value.offprompt === 'show' && typeof value.key === 'string'))

const report = (message: DemoReport) => window.parent.postMessage(message, '*')

const json = (body: unknown) => new Response(JSON.stringify(body), { headers: { 'content-type': 'application/json' } })

/** The fingerprint of what the file would hold, or any four where this browser has no WebCrypto. */
const fingerprint = ({ key, values }: { key: string; values: Values }) =>
  fingerprintOf({ key, values }).catch(() => emojiFrom(crypto.getRandomValues(new Uint8Array(3))))

/** The same values with the first one changed, as a file that holds something else would read back. */
const otherThan = (values: Values): Values => values.map(([name, value], index) => [name, index === 0 ? `${value}.` : value])

/** The Written page with these four in its tiles, their label, and the agent's side of it. */
const writtenWith = ({ html, emoji }: { html: string; emoji: string }) => {
  const next = new DOMParser().parseFromString(html, 'text/html')
  const named = namedEmoji(emoji)
  const list = next.querySelector('ul.emoji')
  list?.setAttribute('aria-label', emoji)
  list?.querySelectorAll('li').forEach((tile, index) => {
    const glyph = tile.querySelector('.glyph')
    const name = tile.querySelector('.name')
    if (glyph !== null) glyph.textContent = named[index]?.glyph ?? ''
    if (name !== null) name.textContent = named[index]?.name ?? ''
  })
  next.querySelectorAll('.terminal .glyphs').forEach((glyph, index) => {
    glyph.textContent = named[index % named.length]?.glyph ?? ''
  })
  return `<!doctype html>${next.documentElement.outerHTML}`
}

const bodyOf = (init: RequestInit | undefined) => (init?.body instanceof URLSearchParams ? init.body : new URLSearchParams())

/** Sets a field as typing would, so the page's checks run on it. */
const put = ({ key, value }: { key: string; value: string }) => {
  const field = valueFields().find(candidate => candidate.dataset.key === key)
  if (field === undefined) return
  field.value = value
  field.dispatchEvent(new Event('input', { bubbles: true }))
}

/** The name the example values go by, as the page says where a fill came from. */
const EXAMPLES_FILE = 'examples.env'

/**
 * The example values, as a `.env` chosen with the page's own Choose file, so the page fills
 * every field the file names and says so. Where the page has no such picker, each field is
 * set in turn.
 */
const fill = (examples: Values) => {
  const picker = document.getElementById('import-file')
  if (!(picker instanceof HTMLInputElement)) {
    examples.forEach(([key, value]) => put({ key, value }))
    return
  }
  const data = new DataTransfer()
  data.items.add(new File([examples.map(([key, value]) => `${key}=${value}`).join('\n')], EXAMPLES_FILE))
  picker.files = data.files
  picker.dispatchEvent(new Event('change', { bubbles: true }))
}

/** Shows the field for this key alone, where the page shows one at a time; showcase styles hide the rest. */
const show = (key: string) =>
  document.querySelectorAll('.values .field').forEach(field => {
    const own = field.querySelector('textarea[data-key]')
    field.toggleAttribute('data-off', !(own instanceof HTMLTextAreaElement && own.dataset.key === key))
  })

/** Tells the site when a field the demo fills holds a long value that is not the demo's own. */
const watchForOwnValues = (config: DemoConfig) => {
  const ours = [...(config.examples ?? []), ...(config.filled ?? [])]
  const known = new Set([...ours.map(([, value]) => value), ...(config.mixUp === undefined ? [] : [config.mixUp.value])])
  const watched = new Set(ours.map(([key]) => key))
  document.addEventListener('input', event => {
    const field = event.target
    if (!(field instanceof HTMLTextAreaElement) || !watched.has(field.dataset.key ?? '')) return
    const value = field.value.trim()
    if (value.length >= OWN_VALUE_LENGTH && !known.has(value)) report({ offprompt: 'own-value' })
  })
}

/** Where the page's content ends: the body itself reaches at least the bottom of the frame. */
const contentHeight = () =>
  Math.ceil(Math.max(0, ...[...document.body.children].map(child => child.getBoundingClientRect().bottom + window.scrollY)))

/**
 * Tells the site how tall the page is whenever that changes, the form's height and then the
 * Written page's, which takes the form's place. The page swaps whole elements, so what is
 * watched is renewed each time it does.
 */
const measure = () => report({ offprompt: 'height', px: contentHeight() })

const reportHeight = () => {
  const resizing = new ResizeObserver(measure)
  const watchAll = () => {
    resizing.disconnect()
    Array.from(document.body.children).forEach(child => resizing.observe(child))
  }
  new MutationObserver(watchAll).observe(document.body, { childList: true })
  watchAll()
}

/** Takes the server's place for the page it runs in. */
export const start = (config: DemoConfig) => {
  const opened = Date.now()
  const state = { mismatch: false }

  const answer = async (_input: RequestInfo | URL, init?: RequestInit) => {
    if (init?.method !== 'POST') {
      return json({ status: 'awaiting', expiresIn: config.ttl - (((Date.now() - opened) / 1000) % config.ttl) })
    }
    const key = bodyOf(init).get('fingerprint') ?? ''
    const values = writtenValues()
    const emoji = await fingerprint({ key, values: state.mismatch ? otherThan(values) : values })
    report({ offprompt: 'written' })
    return new Response(writtenWith({ html: config.written, emoji }), { headers: { 'content-type': 'text/html' } })
  }
  window.fetch = answer

  // Focus moved by the page stays in the frame rather than scrolling the site around it.
  HTMLElement.prototype.focus = () => undefined

  window.addEventListener('message', event => {
    if (event.source !== window.parent || !isDemoMessage(event.data)) return
    const message = event.data
    if (message.offprompt === 'fill' && config.examples !== undefined) fill(config.examples)
    if (message.offprompt === 'mix-up' && config.mixUp !== undefined) put(config.mixUp)
    if (message.offprompt === 'mismatch') state.mismatch = message.on
    if (message.offprompt === 'show' && config.single === true) show(message.key)
    if (message.offprompt === 'measure') measure()
  })
  watchForOwnValues(config)

  // Once the page's own script is listening: it runs after this one, before the page is ready.
  const ready = () => {
    const filled = config.filled ?? []
    filled.forEach(([key, value]) => put({ key, value }))
    const [first] = valueFields()
    if (config.single === true && first !== undefined) show(first.dataset.key ?? '')
    reportHeight()
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready, { once: true })
  else ready()
}
