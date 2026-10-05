import { namedEmoji } from '../../core/emoji.js'
import type { RequestedSecret, SecretRequest } from '../../core/store.js'
import { numbered } from '../../core/wording.js'
import { escapeHtml } from '../html.js'
import { tileFor } from './field.js'
import { icon } from './icons.js'
import {
  askerName,
  askerSubject,
  capitalised,
  CHECK_MARK,
  counted,
  filePath,
  page,
  projectName,
} from './shell.js'

/** What became of each key: typed in and added or replaced, generated, or already set and kept. */
const outcomeOf = (secret: RequestedSecret) => {
  if (secret.value.kind === 'generated') return secret.overwrites ? 'kept' : 'generated'
  return secret.overwrites ? 'replaced' : 'added'
}

const writtenSecrets = (request: SecretRequest) => request.secrets.filter(secret => outcomeOf(secret) !== 'kept')


const heroLine = (request: SecretRequest) => {
  const count = writtenSecrets(request).length
  const file = escapeHtml(request.sink.relativePath)
  const placed = count === 1 ? `The value is in ${file}.` : `${capitalised(counted(count, 'value'))} are in ${file}.`
  return `${placed} ${escapeHtml(askerSubject(request))} has the names and is carrying on.`
}

const tiles = (emoji: string) =>
  namedEmoji(emoji)
    .map(({ glyph, name }) => `<li><span class="glyph">${glyph}</span><span class="name">${escapeHtml(name)}</span></li>`)
    .join('')

/** What the agent's side shows once it has the result, drawn as the terminal it runs in. */
const agentSide = ({ request, emoji }: { request: SecretRequest; emoji: string }) => {
  const count = writtenSecrets(request).length
  const file = escapeHtml(request.sink.relativePath)
  const glyphs = namedEmoji(emoji).map(({ glyph }) => `<span class="glyphs">${glyph}</span>`)
  const chip = `<span class="chip">${glyphs.join('')}</span>`
  return `<div class="terminal" aria-hidden="true">
<div class="terminal-bar"><i></i><i></i><i></i><span>${escapeHtml(askerName(request))} — ${escapeHtml(projectName(request.sink))}</span></div>
<div class="terminal-body">
<div><p><span class="dot">⏺</span><span><span class="tool">offprompt - collect_secret</span> (MCP)</span></p>
<div class="result"><span>⎿ Wrote ${numbered(count, 'value')} to ${file}</span><span>&nbsp; fingerprint${chip}</span></div></div>
<p><span class="dot reply">⏺</span><span class="said">${count === 1 ? 'The value is' : 'The values are'} in ${file}. Fingerprint ${glyphs.join(
    ' ',
  )}.</span></p>
</div>
</div>`
}

/**
 * The four emoji, named, and where the human will see four on the agent's side. The page
 * script puts the four it took from what was typed in place of the server's, and shows the
 * warning when they differ.
 */
const fingerprint = (request: SecretRequest) => {
  const { emoji } = request
  if (emoji === undefined) return ''
  const who = escapeHtml(askerSubject(request))
  // The values that came from the page. A key made on the server, its field empty, is not one.
  const count = request.fingerprinted?.length ?? 0
  const values = count === 1 ? 'the value' : count === 2 ? 'both values' : `all ${counted(count, 'value')}`
  return `<section class="fingerprint">
<p class="eyebrow">${icon('fingerprint')}Fingerprint</p>
<ul class="emoji" aria-label="${escapeHtml(emoji)}">${tiles(emoji)}</ul>
<p class="explainer">These four emoji are a fingerprint of ${values}<span data-needs-script hidden>, made on this page</span>. ${who} works out its own from the file and tells you at once.</p>
<div class="banner bad" data-mismatch hidden>${icon('circle-x')}<div class="banner-text"><p class="banner-title">The file holds something else</p><p>offprompt read back ${
    count === 1 ? 'a value that differs from the one' : 'values that differ from the ones'
  } typed here, so ${escapeHtml(askerName(request))} will show other emoji. Tell it before it uses them.</p></div></div>
<div class="rule"></div>
<div class="look">
<p class="look-label">${icon('terminal')}Look for this in ${escapeHtml(askerName(request))}</p>
${agentSide({ request, emoji })}
<p class="same" data-needs-script hidden>${icon('shield-check')}<span>Same four in ${escapeHtml(askerName(request))}? ${
    count === 1 ? 'The value' : 'The values'
  } arrived exactly as you typed ${count === 1 ? 'it' : 'them'}.</span></p>
</div>
</section>`
}

const receiptRow = (secret: RequestedSecret) => {
  const outcome = outcomeOf(secret)
  const tile = tileFor(secret)
  const mark = outcome === 'kept' ? '' : icon('check')
  return `<li>${tile}<span class="key">${escapeHtml(secret.name)}</span><span class="done ${outcome}">${outcome}</span>${mark}</li>`
}

/** The file, and what happened to each key in it. */
const receipt = (request: SecretRequest) => `<section class="receipt">
<div class="receipt-head"><span class="round-icon">${icon('file-check')}</span>${filePath(request.sink)}<span class="pill">${icon(
  'circle-check',
)}${String(writtenSecrets(request).length)} written</span></div>
<ul>${request.secrets.map(receiptRow).join('')}</ul>
</section>`

/**
 * Shown after a successful write, in place of the form. By now the page holds nothing: the
 * form and its values are gone, and the request is closed, so the tab can go. Only the page
 * script, having taken its own fingerprint, says so and invites the check against the agent's.
 */
export const renderWritten = ({
  request,
  cspNonce,
  host,
}: {
  request: SecretRequest
  cspNonce: string
  host?: string | undefined
}) =>
  page({
    title: 'Written — you can close this tab',
    cspNonce,
    host,
    status: `<p class="status" data-state="open">Done · ${escapeHtml(askerSubject(request))} is carrying on</p>`,
    kind: 'written',
    body: `<div class="hero-tile"><div>${CHECK_MARK}</div></div>
<div class="hero" role="status"><h1 tabindex="-1">Written.</h1><p>${heroLine(request)}</p></div>
${fingerprint(request)}
${receipt(request)}
<div class="closing"><p>You can close this tab.</p><p>The page was single use and won't open again.</p></div>`,
  })
