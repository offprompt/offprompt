import { homedir } from 'node:os'
import { resolve, sep } from 'node:path'

import type { ResolvedSink } from '../../core/sinks.js'
import type { SecretRequest } from '../../core/store.js'
import type { Logo } from '../../registry/schema.js'
import { escapeHtml } from '../html.js'
import { icon, iconSprite } from './icons.js'
import { STYLES } from './styles.js'

/** offprompt's mark: three dots and a ring, drawn in the text colour. */
export const MARK = `<svg class="mark" viewBox="0 0 43 21" aria-hidden="true" focusable="false"><circle cx="5" cy="16" r="5"/><circle class="ring" cx="16" cy="5" r="3.875"/><circle cx="27" cy="16" r="5"/><circle cx="38" cy="16" r="5"/></svg>`

/**
 * The mark as the page shows it once the values are written: the stylesheet gathers the dots
 * onto a checkmark and draws a stroke through them, once, as the page opens.
 */
export const CHECK_MARK = `<svg class="mark to-check" viewBox="0 0 43 21" aria-hidden="true" focusable="false"><circle cx="5" cy="16" r="5"/><circle class="ring" cx="16" cy="5" r="3.875"/><circle cx="27" cy="16" r="5"/><circle cx="38" cy="16" r="5"/><path class="check" d="M10 10.5 L18.5 19 L34 2.5" pathLength="1"/></svg>`

/**
 * The bar across the top: the mark, then whatever the page says about the request, and the
 * address the page was served from.
 */
const topBar = ({ status, host }: { status: string; host: string | undefined }) => `<header class="topbar">
<div class="brand">${MARK}<span>offprompt</span></div>
<div class="session">${status}${host === undefined ? '' : `<span class="divider"></span><span class="host">${escapeHtml(host)}</span>`}</div>
</header>`

export const page = ({
  title,
  cspNonce,
  status = '',
  host,
  body,
  kind,
  script = '',
}: {
  title: string
  cspNonce: string
  /** The status line in the top bar, already rendered. */
  status?: string
  host: string | undefined
  body: string
  /**
   * Which page this is. The written and closed pages say one thing, set down the middle, and
   * the page script only takes an answer to its write for one of them.
   */
  kind: 'form' | 'written' | 'closed'
  script?: string
}) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="referrer" content="no-referrer">
<title>${escapeHtml(title)}</title>
<style nonce="${escapeHtml(cspNonce)}">${STYLES}</style>
</head>
<body>
${iconSprite}
${topBar({ status, host })}
<main data-page="${kind}"${kind === 'form' ? '' : ' class="centered"'}>
${body}
</main>
${script === '' ? '' : `<script nonce="${escapeHtml(cspNonce)}">${script}</script>`}
</body>
</html>
`

/** A logo as a single path on a 24×24 grid. */
const logoSvg = ({ logo, className, fill }: { logo: Logo; className: string; fill: string }) =>
  `<svg class="${className}" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="${escapeHtml(fill)}"${
    logo.evenOdd === true ? ' fill-rule="evenodd"' : ''
  } d="${escapeHtml(logo.path)}"/></svg>`

/** A logo in the text colour, as the offers beside a field draw it. */
export const inlineLogo = (logo: Logo) => logoSvg({ logo, className: 'logo', fill: 'currentColor' })

/**
 * The small tile beside a key: the provider's logo, white on the provider's colour when it
 * has one, or its initial when it has no logo. A kind of value gets an icon instead.
 */
export const logoTile = ({ name, logo, color }: { name: string; logo?: Logo | undefined; color?: string | undefined }) => {
  if (logo === undefined) return `<span class="tile initial" aria-hidden="true">${escapeHtml(name.charAt(0))}</span>`
  return color === undefined
    ? `<span class="tile">${inlineLogo(logo)}</span>`
    : `<svg class="tile" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect width="24" height="24" rx="6" fill="${escapeHtml(
        color,
      )}"/><path fill="#fff" transform="translate(6 6) scale(0.5)"${logo.evenOdd === true ? ' fill-rule="evenodd"' : ''} d="${escapeHtml(
        logo.path,
      )}"/></svg>`
}

export const iconTile = (name: Parameters<typeof icon>[0]) => `<span class="tile">${icon(name)}</span>`

/** The badge of the program that asks: its logo on a tint of its colour, or a plain one. */
export const avatar = (request: SecretRequest) => {
  const { asker } = request
  if (asker?.logo === undefined) return `<span class="avatar plain">${icon('bot')}</span>`
  const color = asker.color ?? '#12332A'
  return `<svg class="avatar" viewBox="0 0 36 36" aria-hidden="true" focusable="false"><circle cx="18" cy="18" r="18" fill="${escapeHtml(
    color,
  )}" fill-opacity="0.13"/><path fill="${escapeHtml(color)}" transform="translate(8 8) scale(0.8333)"${
    asker.logo.evenOdd === true ? ' fill-rule="evenodd"' : ''
  } d="${escapeHtml(asker.logo.path)}"/></svg>`
}

/** Who is asking, by name, or "the agent" when the host did not say. */
export const askerName = (request: SecretRequest) => request.asker?.name ?? 'the agent'

/** The same, to open a sentence with. A name the host gave is kept exactly as given. */
export const askerSubject = (request: SecretRequest) => request.asker?.name ?? 'The agent'

const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve']

/** A small count in words, as a sentence says it: "five values". */
export const counted = (count: number, noun: string) =>
  `${WORDS[count] ?? String(count)} ${noun}${count === 1 ? '' : 's'}`

export const capitalised = (text: string) => `${text.charAt(0).toUpperCase()}${text.slice(1)}`

/** A directory as a person reads it, with their home folder as `~`. */
const shown = (directory: string) => {
  const home = homedir()
  return directory === home || directory.startsWith(`${home}${sep}`) ? `~${directory.slice(home.length)}` : directory
}

/** Any text, such as an error from the file system, with the home folder in it written as `~`. */
export const withHome = (text: string) => text.replaceAll(`${homedir()}${sep}`, `~${sep}`)

/** Past this many characters a directory keeps only its start and its last two folders. */
const LONG_DIRECTORY = 32

const shortened = (directory: string) => {
  if (directory.length <= LONG_DIRECTORY) return directory
  const parts = directory.split(sep)
  return parts.length <= 4 ? directory : [parts[0], '…', ...parts.slice(-2)].join(sep)
}

/** The project the sink sits in: its absolute path with the relative one taken off. */
const projectOf = (sink: ResolvedSink) =>
  resolve(sink.absolutePath, ...sink.relativePath.split('/').map(() => '..'))

/** The project as the page shows it: short, with the whole path on hover. */
export const projectDir = (sink: ResolvedSink) => {
  const whole = shown(projectOf(sink))
  return `<span class="dir" title="${escapeHtml(whole)}">${escapeHtml(shortened(whole))}</span>`
}

/** The project's short name as plain text, for a line that is not markup. */
export const projectName = (sink: ResolvedSink) => shortened(shown(projectOf(sink)))

/** The file as the page names it, its project beside it and the full path on hover. */
export const filePath = (sink: ResolvedSink) =>
  `<span class="path"><span class="file" title="${escapeHtml(sink.absolutePath)}">${escapeHtml(
    sink.relativePath,
  )}</span>${projectDir(sink)}</span>`

/** What the page promises about itself, under the button. */
export const facts = `<ul class="facts">
<li>${icon('file-lock')}Straight into the file</li>
<li>${icon('eye-off')}The agent gets the names</li>
<li>${icon('wifi-off')}No outbound requests</li>
</ul>`
