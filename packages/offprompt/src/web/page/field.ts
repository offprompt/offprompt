import { generatedRules, generatedSummary, madeSummary } from '../../core/generated.js'
import { fieldRules } from '../../core/rules.js'
import type { GeneratedValue, LinkOutcome, RequestedSecret, SecretRequest, TypedValue } from '../../core/store.js'
import { addressOf, inSentence, withArticle } from '../../core/wording.js'
import { referenceOf, type Source } from '../../registry/registry.js'
import { escapeHtml } from '../html.js'
import { icon, type IconName } from './icons.js'
import { askerName, askerSubject, capitalised, iconTile, inlineLogo, logoTile } from './shell.js'

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
 * A link out of the page, from the registry. None carries this page's address with it. A link
 * the agent wrote is never drawn this way: see `suggestedLink`.
 */
const outLink = ({ url, className, body, label }: { url: string; className: string; body: string; label?: string }) =>
  `<a class="${className}" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer"${
    label === undefined ? '' : ` aria-label="${escapeHtml(label)}"`
  }>${body}</a>`

/**
 * Where a provider's key is made, on the right of its name. It reads "Get it", which a long
 * address would crowd the name out of; the address is in its accessible name and, as for any
 * link, in the browser's status bar on hover. It is the registry's page for the key, filled in
 * for the agent's account, organisation or project where it named one.
 */
const getLink = ({ source, url }: { source: Source; url: string }) =>
  outLink({
    url,
    className: 'get',
    label: `Get ${withArticle(`${source.provider.name} ${inSentence(source.credential.label)}`)} at ${addressOf(url)}`,
    body: `<span>Get it</span>${icon('arrow-up-right')}`,
  })

type Suggested = Extract<LinkOutcome, { kind: 'suggested' }>

const suggestedId = (index: number) => `suggested${String(index)}`

/**
 * The agent's own link, under "Get it" and never in its place, marked as its suggestion with
 * its whole host. It is a button rather than a link: it opens a box naming the host, and only
 * the link in that box goes anywhere. With the page script off it reads as text, as an address
 * in the agent's reason does.
 */
const suggestedLink = ({ request, link, index }: { request: SecretRequest; link: Suggested; index: number }) => {
  const by = `<span>Suggested by ${escapeHtml(askerName(request))}</span>`
  return `<span class="suggestion"><button type="button" class="suggested" data-suggested="${suggestedId(
    index,
  )}" aria-haspopup="dialog" data-needs-script hidden>${icon('bot')}${by}<strong class="suggested-host">${escapeHtml(
    link.host,
  )}</strong></button><noscript><span class="suggested">${icon('bot')}${by}<strong class="suggested-host">${escapeHtml(
    addressOf(link.url),
  )}</strong></span></noscript></span>`
}

/**
 * What the agent's link opens: a box that names the whole host and says offprompt has not
 * checked it. Its own link opens in a new tab and, like every link here, sends nothing of
 * this page.
 */
const confirmBox = ({ request, link, index }: { request: SecretRequest; link: Suggested; index: number }) => {
  const id = suggestedId(index)
  const host = escapeHtml(link.host)
  const who = escapeHtml(request.asker?.name ?? 'your agent')
  return `\n<dialog class="confirm" id="${id}" aria-labelledby="${id}-title" aria-describedby="${id}-said">
<span class="confirm-icon">${icon('triangle-alert')}</span>
<h2 class="confirm-title" id="${id}-title">Open <strong>${host}</strong>?</h2>
<p class="confirm-said" id="${id}-said">This link was proposed by ${who} and not verified by offprompt. Make sure it is a site you expect before you sign in or copy a key there.</p>
<code class="confirm-url">${escapeHtml(link.url)}</code>
<div class="confirm-actions"><button type="button" class="secondary" data-dismiss>Cancel</button><a class="confirm-open" href="${escapeHtml(
    link.url,
  )}" target="_blank" rel="noopener noreferrer" data-dismiss>Open ${host}${icon('arrow-up-right')}</a></div>
</dialog>`
}

const suggestedOf = (secret: RequestedSecret) => (secret.link?.kind === 'suggested' ? secret.link : undefined)

/** What goes right of the name: where to get the key, or what kind of value it is. */
const asideOf = ({ secret, value }: { secret: RequestedSecret; value: TypedValue }) => {
  if (value.source !== undefined) {
    return getLink({ source: value.source, url: secret.link?.kind === 'filled' ? secret.link.url : value.source.credential.url })
  }
  return value.label === undefined ? '' : `<span class="aside">${escapeHtml(capitalised(value.label))}</span>`
}

/** The agent's own link, on a line of the head's own under whatever is right of the name. */
const suggestionOf = ({ request, secret, index }: { request: SecretRequest; secret: RequestedSecret; index: number }) => {
  const suggested = suggestedOf(secret)
  return suggested === undefined ? '' : suggestedLink({ request, link: suggested, index })
}

const fieldHead = ({
  request,
  secret,
  value,
  index,
}: {
  request: SecretRequest
  secret: RequestedSecret
  value: TypedValue
  index: number
}) =>
  `<div class="field-head"><span class="field-name">${tileFor(secret)}<label class="key" for="${fieldName(index)}">${escapeHtml(
    secret.name,
  )}</label></span>${asideOf({ secret, value })}${suggestionOf({ request, secret, index })}</div>`

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

/**
 * Lets the human write a value its own checks refuse, since a provider may have changed a key's
 * format since the registry learnt it. Checks of where the value goes are never lifted. The
 * page script shows the box once a value breaks the field's own checks and nothing else, and
 * unticks it when it hides it; a refused write without the script comes back with it showing.
 */
const anywayBox = (field: FieldArguments) => {
  const rules = rulesOf(field)
  if (rules.every(rule => rule.binding === true)) return ''
  const broken = rules.filter(rule => field.broken.includes(rule.message))
  const shown = broken.length > 0 && broken.every(rule => rule.binding !== true)
  return `\n<label class="override anyway" data-anyway${shown ? '' : ' hidden'}><input type="checkbox" name="anyway${String(
    field.index,
  )}" value="yes"><span>Write it anyway. ${escapeHtml(askerSubject(field.request))} is told it did not pass these checks.</span></label>`
}

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

const below = (field: FieldArguments) => {
  const suggested = suggestedOf(field.secret)
  return `${ruleLines(field)}${scriptLines(field)}${anywayBox(field)}${generateHint(field)}${uncheckedLine(field.value)}${offersLine(
    field.value,
  )}${replaceNotice(field)}${suggested === undefined ? '' : confirmBox({ request: field.request, link: suggested, index: field.index })}`
}

/**
 * A single-line value still goes in a textarea. Safari's AutoFill takes any input masked with
 * `-webkit-text-security`, or typed as a password, for a password field, and offers to save
 * what was typed into it once the field is submitted or leaves the page. It never takes a
 * textarea for one. The page script and the server drop line breaks, as a text input would.
 */
const singleLineField = (field: FieldArguments) => {
  const names = [...(field.value.masked ? ['secret'] : []), ...(field.broken.length > 0 ? ['invalid'] : [])]
  return `<div class="field">
${fieldHead({ request: field.request, secret: field.secret, value: field.value, index: field.index })}${captionLine(field.secret)}
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
${fieldHead({ request: field.request, secret: field.secret, value: field.value, index: field.index })}${captionLine(field.secret)}
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
