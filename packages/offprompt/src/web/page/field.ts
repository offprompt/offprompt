import { generatedRules, generatedSummary, madeSummary } from '../../core/generated.js'
import { fieldRules } from '../../core/rules.js'
import type { GeneratedValue, RequestedSecret, SecretRequest, TypedValue } from '../../core/store.js'
import { inSentence, withArticle } from '../../core/wording.js'
import { referenceOf, type Source } from '../../registry/registry.js'
import { escapeHtml } from '../html.js'
import { icon, type IconName } from './icons.js'
import { askerSubject, capitalised, iconTile, inlineLogo, logoTile } from './shell.js'

/** The rules each field breaks, by field. A field missing from the map passed. */
export type FieldProblems = ReadonlyMap<number, readonly string[]>

export const REQUIRED = 'a value is required'

const fieldName = (index: number) => `value${String(index)}`

type FieldArguments = {
  request: SecretRequest
  secret: RequestedSecret
  value: TypedValue
  index: number
  broken: readonly string[]
  /** A key offprompt would generate: the page makes one, and the human may paste their own. */
  generate?: GeneratedValue
}

/** The icon for a kind of value no provider owns. */
const FORMAT_ICONS: Readonly<Record<string, IconName>> = {
  postgres_url: 'database',
  email: 'mail',
  url: 'link',
  hostname: 'globe',
  pem: 'file-key',
  json: 'braces',
  integer: 'hash',
  hex: 'binary',
  base64: 'binary',
  uuid: 'binary',
  jwt: 'binary',
}

const tileOf = (value: TypedValue) =>
  value.source === undefined
    ? iconTile(FORMAT_ICONS[value.format ?? ''] ?? 'key-round')
    : logoTile(value.source.provider)

/** The tile beside a key wherever it is listed: the provider's logo, or an icon for its kind. */
export const tileFor = (secret: RequestedSecret) =>
  secret.value.kind === 'generated' ? iconTile('dices') : tileOf(secret.value)

/**
 * A link out of the page. Only links from the registry are drawn, never one the agent
 * wrote, and none carries this page's address with it.
 */
const outLink = ({ url, className, body, label }: { url: string; className: string; body: string; label?: string }) =>
  `<a class="${className}" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer"${
    label === undefined ? '' : ` aria-label="${escapeHtml(label)}"`
  }>${body}</a>`

/** A link read as an address, without the scheme or a trailing slash. */
const addressOf = (url: string) => {
  const { host, pathname } = new URL(url)
  return `${host}${pathname === '/' ? '' : pathname.replace(/\/$/, '')}`
}

/**
 * Where a provider's key is made, on the right of its name. It reads "Get it", which a long
 * address would crowd the name out of; the address is in its accessible name and, as for any
 * link, in the browser's status bar on hover.
 */
const getLink = ({ provider, credential }: Source) =>
  outLink({
    url: credential.url,
    className: 'get',
    label: `Get ${withArticle(`${provider.name} ${inSentence(credential.label)}`)} at ${addressOf(credential.url)}`,
    body: `<span>Get it</span>${icon('arrow-up-right')}`,
  })

/** What goes right of the name: where to get the key, or what kind of value it is. */
const asideOf = (value: TypedValue) => {
  if (value.source !== undefined) return getLink(value.source)
  return value.label === undefined ? '' : `<span class="aside">${escapeHtml(capitalised(value.label))}</span>`
}

const fieldHead = ({ secret, value, id }: { secret: RequestedSecret; value: TypedValue; id: string }) =>
  `<div class="field-head"><span class="field-name">${tileFor(secret)}<label class="key" for="${id}">${escapeHtml(
    secret.name,
  )}</label></span>${asideOf(value)}</div>`

const captionLine = (secret: RequestedSecret) =>
  secret.caption === undefined ? '' : `\n<p class="caption">${escapeHtml(secret.caption)}</p>`

/** Every rule a field is checked against, including the quiet ones its destination adds. */
const rulesOf = ({ request, value }: FieldArguments) => fieldRules({ rules: value.rules, sinkKind: request.sink.kind })

/** Three marks per line; the stylesheet shows the one the line's state calls for. */
const RULE_MARKS = `${icon('circle', 'idle-mark')}${icon('circle-check', 'pass-mark')}${icon('circle-x', 'fail-mark')}`

const ruleLine = ({ attributes, message }: { attributes: string; message: string }) =>
  `\n  <li ${attributes}>${RULE_MARKS}<span>${escapeHtml(message)}</span></li>`

/** Said when a field arrives empty: who wanted it. */
const requiredLine = (request: SecretRequest) => `Required. ${askerSubject(request)} asked for this one.`

/**
 * One line per rule under a field. The page script turns each line green or red as the
 * value changes; the server marks the lines a submitted value broke. A quiet rule is drawn
 * hidden and only shows once it fails.
 */
const ruleLines = (field: FieldArguments) => {
  const id = fieldName(field.index)
  const required = field.broken.includes(REQUIRED)
    ? ruleLine({ attributes: 'class="fail" data-required', message: requiredLine(field.request) })
    : ''
  const lines = rulesOf(field)
    .map((rule, position) => {
      const failed = field.broken.includes(rule.message)
      const state = failed ? ' class="fail"' : ''
      const quiet = rule.quiet === true ? ` data-quiet${failed ? '' : ' hidden'}` : ''
      return ruleLine({ attributes: `data-rule="${String(position)}"${state}${quiet}`, message: rule.message })
    })
    .join('')
  return `<ul class="rules" id="${id}-rules">${required}${lines}\n</ul>`
}

/** The page script checks the value against the same rules the server does, handed over as data. */
const fieldAttributes = (field: FieldArguments) => {
  const id = fieldName(field.index)
  const placeholder =
    field.value.placeholder === undefined ? '' : ` placeholder="${escapeHtml(field.value.placeholder)}"`
  const source = field.value.source === undefined ? '' : ` data-source="${escapeHtml(referenceOf(field.value.source))}"`
  const generate =
    field.generate === undefined
      ? ''
      : ` data-generate="${escapeHtml(JSON.stringify({ bytes: field.generate.bytes, encoding: field.generate.encoding }))}"`
  return `id="${id}" name="${id}" data-key="${escapeHtml(field.secret.name)}"
       data-rules="${escapeHtml(JSON.stringify(rulesOf(field)))}"${source}${generate}${placeholder}
       aria-describedby="${id}-rules" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false"${
         field.broken.length > 0 ? ' aria-invalid="true"' : ''
       }`
}

const classes = (names: readonly string[]) => (names.length === 0 ? '' : ` class="${names.join(' ')}"`)

const STATE_MARKS = `${icon('check', 'ok-mark')}${icon('x', 'bad-mark')}`

/** Cuts spaces off both ends of a value. The page script shows it when there are any. */
const TRIM = `<button type="button" class="act" data-trim hidden>${icon('scissors')}Trim</button>`

/** Makes a value, or a new one, in the page. The page script shows whichever fits. */
const GENERATE = `<button type="button" class="act" data-generate-new hidden>${icon(
  'sparkles',
)}Generate</button><button type="button" class="act" data-regenerate hidden>${icon('refresh-cw')}Regenerate</button>`

/** Shows or hides this one value. It needs the page script, so it arrives hidden. */
const revealButton = (secret: RequestedSecret) =>
  `<button type="button" class="reveal" data-reveal data-needs-script hidden aria-pressed="false" aria-label="Show ${escapeHtml(
    secret.name,
  )}">${icon('eye', 'when-off')}${icon('eye-off', 'when-on')}</button>`

/** Said under a value no rule checks, so an empty list does not read as a page that forgot. */
const UNCHECKED = 'Not in the registry, so there is nothing to check. Written as typed.'

/** The same, once something is typed. */
const UNCHECKED_FILLED = 'No requirements for this key. Written exactly as typed.'

const uncheckedLine = (value: TypedValue) =>
  value.rules.length === 0 && value.source === undefined
    ? `\n<p class="hint" data-unchecked data-empty="${UNCHECKED}" data-filled="${UNCHECKED_FILLED}">${UNCHECKED}</p>`
    : ''

/** What a value that passes every rule is taken to be, said in one line in place of the rules. */
const summaryOf = (value: TypedValue) => {
  if (value.source !== undefined) {
    const { provider, credential } = value.source
    return `Looks like ${withArticle(`${provider.name} ${inSentence(credential.label)}`)}`
  }
  return value.label === undefined ? undefined : `Looks like ${withArticle(value.label)}`
}

/** Said once a value the page made is in place, in place of what a pasted one looks like. */
const madeAttribute = (generate?: GeneratedValue) =>
  generate === undefined ? '' : ` data-made="${escapeHtml(madeSummary(generate))}"`

/**
 * Lines the page script fills: the one-line summary once every rule passes, the key a wrong
 * value looks like, and spaces at either end. With the script off they stay hidden.
 */
const scriptLines = ({ value, generate }: { value: TypedValue; generate?: GeneratedValue | undefined }) => {
  const summary = generate === undefined ? summaryOf(value) : generatedSummary(generate)
  const summaryLine =
    summary === undefined
      ? ''
      : `\n<p class="summary" data-summary hidden>${icon('circle-check', 'typed-mark')}${icon(
          'file-check',
          'file-mark',
        )}<span data-said="${escapeHtml(summary)}"${madeAttribute(generate)}>${escapeHtml(summary)}</span></p>`
  return `${summaryLine}
<p class="hint bad" data-hint hidden></p>
<p class="space-note" data-space hidden>${icon('triangle-alert')}<span></span></p>`
}

/** Said under an empty generated field: where Generate gets its value. */
const generateHint = ({ request, generate }: { request: SecretRequest; generate?: GeneratedValue | undefined }) =>
  generate === undefined
    ? ''
    : `\n<p class="hint" data-generate-hint hidden>${
        request.remote
          ? 'Generate makes one in this browser from random bytes, and it is encrypted with the other values.'
          : 'Generate makes one here from local random bytes. Nothing leaves your machine.'
      }</p>`

/** Who can create a value of this kind, for someone who has none yet. */
const offersLine = (value: TypedValue) => {
  const offers = value.offers
    .map(({ provider, url }) =>
      outLink({ url, className: 'offer', body: `${provider.logo === undefined ? '' : inlineLogo(provider.logo)}${escapeHtml(provider.name)}` }),
    )
    .join(' ')
  return offers === '' ? '' : `\n<p class="offers">Need one? Create it with ${offers}</p>`
}

/** The key is already in the destination, so writing replaces what is there. */
const replaceNotice = ({ request, secret }: { request: SecretRequest; secret: RequestedSecret }) => {
  if (!secret.overwrites) return ''
  const file = escapeHtml(request.sink.relativePath)
  const [what, writing] =
    request.sink.kind === 'file'
      ? [`${file} already exists. Writing will replace it.`, `Replacing ${file}.`]
      : [`Already in ${file}. Writing will replace the current value.`, `Replacing the current value in ${file}.`]
  return `\n<p class="notice">${icon('triangle-alert')}<span data-writing="${writing}">${what}</span></p>`
}

const below = (field: FieldArguments) =>
  `${ruleLines(field)}${scriptLines(field)}${generateHint(field)}${uncheckedLine(field.value)}${offersLine(
    field.value,
  )}${replaceNotice(field)}`

/**
 * A single-line value still goes in a textarea. Safari's AutoFill takes any input masked with
 * `-webkit-text-security`, or typed as a password, for a password field, and offers to save
 * what was typed into it once the field is submitted or leaves the page. It never takes a
 * textarea for one. The page script and the server drop line breaks, as a text input would.
 */
const singleLineField = (field: FieldArguments) => {
  const id = fieldName(field.index)
  const names = [...(field.value.masked ? ['secret'] : []), ...(field.broken.length > 0 ? ['invalid'] : [])]
  return `<div class="field">
${fieldHead({ secret: field.secret, value: field.value, id })}${captionLine(field.secret)}
<div class="input"><textarea${classes(names)} rows="1" data-single-line ${fieldAttributes(field)}></textarea>${
    field.value.masked ? revealButton(field.secret) : ''
  }${STATE_MARKS}${field.generate === undefined ? '' : GENERATE}${TRIM}</div>
${below(field)}
</div>`
}

/** A tall field, with a picker that reads a file into it; the file itself is posted only with the script off. */
const multiLineField = (field: FieldArguments) => {
  const id = fieldName(field.index)
  return `<div class="field">
${fieldHead({ secret: field.secret, value: field.value, id })}${captionLine(field.secret)}
<div class="input multi"><textarea${classes(field.broken.length > 0 ? ['invalid'] : [])} ${fieldAttributes(field)}></textarea>${STATE_MARKS}</div>
<div class="pick"><input id="${id}-file" name="${id}-file" type="file" data-fills="${id}" aria-label="Choose a file for ${escapeHtml(
    field.secret.name,
  )}"></div>
${below(field)}
</div>`
}

/** A generated key the file already holds. Nothing is typed or written: it stays as it is. */
const keptField = (secret: RequestedSecret) => `<div class="field" data-generated="${escapeHtml(secret.name)}">
<div class="field-head"><span class="field-name">${tileFor(secret)}<span class="key">${escapeHtml(
  secret.name,
)}</span></span><span class="aside">kept</span></div>
<p class="input static">Already set, so it is kept as it is.</p>
</div>`

/**
 * A key offprompt would generate, as a field of its own: the page fills it from random bytes
 * when it opens, and the human may make another or paste one they already use. A field that
 * arrives empty, as it does with the script off, is generated on the server.
 */
const generatedValue = (generate: GeneratedValue): TypedValue => ({
  kind: 'typed',
  rules: generatedRules(generate),
  multiline: false,
  masked: true,
  placeholder: 'Left empty, offprompt makes one',
  offers: [],
})

export const valueField = ({
  request,
  secret,
  index,
  broken,
}: {
  request: SecretRequest
  secret: RequestedSecret
  index: number
  broken: readonly string[]
}) => {
  if (secret.value.kind === 'generated') {
    if (secret.overwrites) return keptField(secret)
    return singleLineField({ request, secret, value: generatedValue(secret.value), index, broken, generate: secret.value })
  }
  const field = { request, secret, value: secret.value, index, broken }
  return secret.value.multiline ? multiLineField(field) : singleLineField(field)
}
