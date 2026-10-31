import { namedEmoji } from '../../core/emoji.js'
import type { RequestedSecret, SecretRequest } from '../../core/store.js'
import { numbered } from '../../core/wording.js'
import type { Logo } from '../../registry/schema.js'
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
  inlineLogo,
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

/** X's mark, from Simple Icons, on the link that shares the run there. */
const X_LOGO: Logo = {
  path: 'M14.234 10.162 22.977 0h-2.072l-7.591 8.824L7.251 0H.258l9.168 13.343L.258 24H2.33l8.016-9.318L16.749 24h6.993zm-2.837 3.299-.929-1.329L3.076 1.56h3.182l5.965 8.532.929 1.329 7.754 11.09h-3.182z',
}

/**
 * Where the post says the values went: a `.env` file by its name, which every project shares,
 * or else the project, since a file of its own may be named after what it holds.
 */
const destination = (request: SecretRequest) => {
  const name = request.sink.relativePath.split('/').at(-1) ?? ''
  return request.sink.kind === 'dotenv' && name.startsWith('.env') ? name : 'the project'
}

/**
 * What a post on X says about the run. It carries the count and the file's name and nothing
 * else: no key's name, and nothing taken from a value.
 */
export const shareText = ({ count, file }: { count: number; file: string }) =>
  count === 1
    ? `My AI agent just set up 1 API key and never saw it. It went straight to ${file} via offprompt https://offprompt.dev`
    : `My AI agent just set up ${String(count)} API keys and never saw one of them. Secrets went straight to ${file} via offprompt https://offprompt.dev`

/**
 * The run, said in one line to show someone, with a link that opens a post on X. It is a
 * plain link: nothing leaves the page unless the human clicks it, and then only that text.
 */
const share = (request: SecretRequest) => {
  const count = writtenSecrets(request).length
  if (count === 0) return ''
  const text = shareText({ count, file: destination(request) })
  const url = `https://x.com/intent/post?text=${encodeURIComponent(text)}`
  const who = request.asker?.name ?? 'Your agent'
  return `<section class="share">
<p class="share-line">${escapeHtml(who)} set up <strong>${String(count)} ${count === 1 ? 'key' : 'keys'}</strong> and never saw ${
    count === 1 ? 'it' : 'one'
  }.</p>
<a class="secondary share-x" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${inlineLogo(X_LOGO)}Share on X</a>
</section>`
}

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
${share(request)}
<div class="closing"><p>You can close this tab.</p><p>The page was single use and won't open again.</p></div>`,
  })
