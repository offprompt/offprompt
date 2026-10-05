import type { SecretRequest } from '../../core/store.js'
import { numbered } from '../../core/wording.js'
import { providers, referenceOf } from '../../registry/registry.js'
import type { Rule } from '../../registry/schema.js'
import type { KnownKey } from '../client/lines.js'
import { pasteScript } from '../client-script.js'
import { escapeHtml } from '../html.js'
import { renderMarkdown } from '../markdown.js'
import { valueField, type FieldProblems } from './field.js'
import { icon } from './icons.js'
import {
  askerName,
  askerSubject,
  avatar,
  counted,
  facts,
  filePath,
  page,
  projectDir,
  withHome,
} from './shell.js'

/** Who asks, where they work, and what they say they need the values for. */
const requestHeader = (request: SecretRequest) => {
  const via = request.asker?.via === undefined ? '' : `<span class="via"> in ${escapeHtml(request.asker.via)}</span>`
  return `<section class="request">
<div class="requester">${avatar(request)}<div class="who"><span class="agent">${escapeHtml(
    askerSubject(request),
  )}${via}</span>${projectDir(request.sink)}</div></div>
<h1>${escapeHtml(askerSubject(request))} is asking for ${counted(request.secrets.length, 'value')}.</h1>
<div class="claim">${renderMarkdown(request.reason)}</div>
</section>`
}

/** What the destination already holds, and whether writing there is safe, in a few words. */
const destinationState = ({ request, writable }: { request: SecretRequest; writable: boolean }) => {
  const { sink } = request
  if (!writable) return '<span class="state bad">not writable</span>'
  if (sink.tracked) return '<span class="state bad">tracked by git</span>'
  const set = request.secrets.filter(secret => secret.overwrites).length
  const held =
    sink.kind === 'file'
      ? set > 0
        ? ['exists', 'will be replaced']
        : ['new file']
      : [sink.exists ? 'exists' : 'new file', ...(set > 0 ? [`${numbered(set, 'key')} already set`] : [])]
  const parts = [...held, ...(sink.ignored ? [] : ['not gitignored'])]
  const warn = set > 0 || !sink.ignored
  return `<span class="state${warn ? ' warn' : ''}">${parts.join(' · ')}</span>`
}

const SEALED_LINE = "Values are encrypted in this browser. Only the agent's sandbox can read them."

/**
 * Said under the destination of a remote request, whose file is in the sandbox, with room
 * for the page script to say why it cannot encrypt, should it not be able to.
 */
const sealedLine = (request: SecretRequest) =>
  request.remote
    ? `\n<p class="sealed">${icon('lock')}${escapeHtml(SEALED_LINE)}</p>\n<p id="seal-status" class="fill-status" role="alert"></p>`
    : ''

const destination = ({ request, writable }: { request: SecretRequest; writable: boolean }) => `<section class="card target">
<span class="round-icon">${icon('file-text')}</span>
<div class="target-text"><span class="target-label">Writes to</span>${filePath(request.sink)}</div>
${destinationState({ request, writable })}
</section>${sealedLine(request)}`

/** The keys a paste or a file can fill: all but generated ones the file already holds. */
const fillable = (request: SecretRequest) =>
  request.secrets.filter(secret => secret.value.kind === 'typed' || !secret.overwrites)

/** A `.env` block fills a dotenv request; a file request takes its one value through its own picker. */
const takesEnvFiles = (request: SecretRequest) => request.sink.kind === 'dotenv'

/**
 * Pasting a block anywhere fills every field it names, and the picker and a drop do the
 * same with a file. They only work with the page script, so they arrive hidden and the
 * script reveals them. The picker has no name, so the file itself is never submitted.
 */
const importCard = (request: SecretRequest) => {
  if (!takesEnvFiles(request)) return ''
  const many = fillable(request).length > 1
  return `<section class="import" data-needs-script hidden>
<span class="square-icon">${icon('clipboard-paste')}</span>
<div class="import-text"><p class="import-title">${many ? 'Paste them all at once' : 'Paste it from a .env'} <kbd data-shortcut="V">⌘ V</kbd></p>
<p>Anywhere on this page. offprompt matches ${many ? 'each key to its field' : 'the key to its field'}. You can also drop a .env file.</p></div>
<input id="import-file" class="import-input" type="file">
<label class="secondary" for="import-file" title="Hidden files: press ⌘⇧. in the picker, or drop the file on the page">${icon('upload')}Choose file</label>
</section>
<section class="import filled" data-filled role="status" hidden>
<span class="square-icon">${icon('clipboard-check')}</span>
<div class="import-text"><p class="import-title" data-filled-title></p><p data-filled-body></p></div>
<button type="button" class="secondary" data-undo>${icon('undo-2')}Undo</button>
</section>`
}

/** Where the page script says what a fill or a write could not do. */
const FILL_STATUS = '<p id="fill-status" class="fill-status" role="status" aria-live="polite"></p>'

/** Shown while a file is dragged over the page: what dropping it will do. The page script shows it. */
const dropOverlay = (request: SecretRequest) => {
  if (!takesEnvFiles(request)) return ''
  const names = fillable(request).map(secret => secret.name)
  const shown = names.length > 4 ? names.slice(0, 3) : names
  const more = names.length - shown.length
  const chips = [...shown.map(name => escapeHtml(name)), ...(more > 0 ? [`+${String(more)}`] : [])]
  const keys = names.length === 1 ? 'the key' : `the ${counted(names.length, 'key')}`
  return `<div class="drop-overlay" data-drop hidden><div class="drop-card">
<span class="drop-icon">${icon('file-input')}</span>
<p class="drop-title">Drop to fill the fields</p>
<p>offprompt reads the file here on the page and fills ${keys} ${escapeHtml(askerName(request))} asked for. Anything else in the file is skipped.</p>
<ul class="chips">${chips.map(chip => `<li>${chip}</li>`).join('')}</ul>
</div></div>`
}

/**
 * Masking is CSS, because no password field can be unmasked without script, so one switch
 * reveals every masked field at once and still works with script off. The switch carries
 * no name, so the choice is never submitted with the values.
 */
const valuesHead = (request: SecretRequest) => {
  // A generated key the page fills is masked too; one the file already holds has no field.
  const masked = request.secrets.some(secret =>
    secret.value.kind === 'typed' ? secret.value.masked : !secret.overwrites,
  )
  const toggle = masked
    ? `<span class="toggle"><input id="reveal-all" type="checkbox" aria-label="Show values"><label for="reveal-all">${icon(
        'eye',
        'when-off',
      )}${icon('eye-off', 'when-on')}<span class="toggle-text"></span><span class="track"><span class="knob"></span></span></label></span>`
    : ''
  return `<div class="values-head"><p class="count"><strong>${numbered(
    request.secrets.length,
    'value',
  )}</strong> asked for by ${escapeHtml(askerName(request))}</p>${toggle}</div>`
}

const valueFields = ({ request, problems }: { request: SecretRequest; problems: FieldProblems }) =>
  request.secrets
    .map((secret, index) => valueField({ request, secret, index, broken: problems.get(index) ?? [] }))
    .join('\n')

/** Only the human can allow a write to a file git tracks, so the page asks, by the button. */
const trackedWarning = (request: SecretRequest) =>
  request.sink.tracked
    ? `<div class="banner bad">${icon('triangle-alert')}<div class="banner-text">
<p class="banner-title">git already tracks this file</p>
<p>Values written to ${escapeHtml(request.sink.relativePath)} would go into the next commit.</p>
<label class="override"><input type="checkbox" name="allowTracked" value="yes"><span>Write to it anyway</span></label>
</div></div>`
    : ''

/** A problem that is not about one field, shown by the button. */
const errorBlock = (error: string | undefined) =>
  error === undefined
    ? ''
    : `<div class="banner bad error" role="alert" tabindex="-1">${icon('circle-x')}<div class="banner-text"><p class="banner-title">Nothing was written</p><p>${escapeHtml(
        error,
      )}</p></div></div>\n`

/**
 * The file system refused the write. The request stays open and, with the page script, the
 * values stay in their fields, so the human can fix the file and try again.
 */
const failureBlock = ({ request, failure }: { request: SecretRequest; failure: string | undefined }) =>
  failure === undefined
    ? ''
    : `<div class="banner bad error" role="alert" tabindex="-1" data-write-failed>${icon('circle-x')}<div class="banner-text">
<p class="banner-title">Couldn't write to ${escapeHtml(request.sink.relativePath)}</p>
<p><span data-needs-script hidden>Nothing was written, and your values are still on this page. Check that the file and its folder can be written, then try again.</span><noscript>Nothing was written. Check that the file and its folder can be written, then type the values again.</noscript></p>
<code class="failure">${escapeHtml(withHome(failure))}</code>
</div></div>\n`

/** A remote page seals its values with the page script, so it says what it needs when that is off. */
const noScriptLine = (request: SecretRequest) =>
  request.remote
    ? `\n<noscript><div class="banner bad">${icon('circle-x')}<div class="banner-text"><p class="banner-title">This page needs JavaScript</p><p>It encrypts your values before they leave this browser.</p></div></div></noscript>`
    : ''

const prefixesOf = (rules: readonly Rule[]): readonly string[] =>
  rules.flatMap(rule => {
    if (rule.kind === 'prefix') return rule.anyOf
    if (rule.kind === 'either') return rule.options.flatMap(prefixesOf)
    return []
  })

/**
 * Every provider key with a prefix, so the page script can tell the human which key a
 * wrong value looks like. Plain registry data: names, labels, links and prefixes.
 */
const KNOWN_KEYS: readonly KnownKey[] = providers.flatMap(provider =>
  provider.credentials
    .map(credential => ({
      ref: referenceOf({ provider, credential }),
      provider: provider.name,
      label: credential.label,
      url: credential.url,
      prefixes: prefixesOf(credential.rules),
    }))
    .filter(key => key.prefixes.length > 0),
)

/**
 * The line in the top bar that says whether the agent's side still answers. The page script
 * fills it. Its clock ticks every second, so it is no live region: a lost connection or a
 * closed request is announced by the banner that comes with it.
 */
const CONNECTION = '<p id="connection" class="status" data-needs-script hidden></p>'

/** The entry page. Everything on it is rendered from the request record. */
export const renderForm = ({
  request,
  cspNonce,
  host,
  writable = true,
  error,
  problems = new Map(),
  failure,
}: {
  request: SecretRequest
  cspNonce: string
  /** The address the page was asked for under, shown in the top bar. */
  host?: string | undefined
  /** Whether this process can write the file, checked when the page is served. */
  writable?: boolean
  error?: string
  problems?: FieldProblems
  /** Why the last write failed, when it did. */
  failure?: string
}) => {
  const multiline = request.secrets.some(secret => secret.value.kind === 'typed' && secret.value.multiline)
  const encoding = multiline ? ' enctype="multipart/form-data"' : ''
  return page({
    title: `offprompt — ${request.secrets.map(secret => secret.name).join(', ')}`,
    cspNonce,
    status: CONNECTION,
    host,
    kind: 'form',
    script: pasteScript,
    body: `${requestHeader(request)}${noScriptLine(request)}
${destination({ request, writable })}
${importCard(request)}
${FILL_STATUS}
<div id="page-notice" class="banner page-notice" role="alert" hidden>${icon('unplug', 'lost-mark')}${icon(
      'circle-x',
      'closed-mark',
    )}${icon('circle-check', 'written-mark')}<div class="banner-text"><p class="banner-title"></p><p></p></div></div>
<form method="post" action="/r/${escapeHtml(request.token)}" autocomplete="off"${encoding}${
      request.remote ? ' data-sealed' : ''
    } data-known="${escapeHtml(JSON.stringify(KNOWN_KEYS))}" data-file="${escapeHtml(request.sink.relativePath)}" data-asker="${escapeHtml(
      askerName(request),
    )}">
<input type="hidden" name="nonce" value="${escapeHtml(request.nonce)}">
<section class="values">
${valuesHead(request)}
${valueFields({ request, problems })}
</section>
${trackedWarning(request)}
<div class="actions">
<div class="progress" data-needs-script hidden><span class="bar"><span class="bar-fill"></span></span><span data-ready></span><span class="progress-note" data-progress-note></span></div>
${errorBlock(error)}${failureBlock({ request, failure })}<button type="submit" class="primary" data-submit${
      request.remote ? ' disabled' : ''
    }>${icon('file-input', 'button-icon')}${icon('rotate-ccw', 'button-icon retry-icon')}${icon(
      'loader-circle',
      'button-icon spin',
    )}<span data-label>Write to ${escapeHtml(request.sink.relativePath)}</span><kbd class="button-kbd" data-shortcut="↵">⌘ ↵</kbd></button>
</div>
</form>
${facts}
${dropOverlay(request)}`,
  })
}
