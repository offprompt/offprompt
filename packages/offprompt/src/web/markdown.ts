import { escapeHtml } from './html.js'

/**
 * The Markdown an agent writes in its reason, rendered to a fixed set of tags that carry no
 * attributes. Everything is escaped before any of it is read as Markdown, so no markup can
 * come through. Links and images show their target as text rather than becoming clickable:
 * this is the page a person types secrets into, and a link a steered agent places there is
 * the one thing on it worth phishing with.
 */

/** Splitting on a captured group alternates text and capture: odd positions are the capture. */
const isCapture = (index: number) => index % 2 === 1

/** Link and image syntax, shown as the label followed by where it pointed. */
const unlink = (text: string) =>
  text.replace(/!?\[([^\]\n]*)\]\(([^)\s]+)\)/g, (_match, label: string, target: string) =>
    label === '' ? target : `${label} (${target})`,
  )

const emphasise = (text: string) =>
  text
    .replace(/\*\*(?=\S)([^*]+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(?<![\w\\])__(?=\S)([^_]+?)__(?![\w])/g, '<strong>$1</strong>')
    .replace(/(?<![*\w])\*(?=\S)([^*\n]+?)\*(?![*\w])/g, '<em>$1</em>')
    // Only a whole word in underscores: STRIPE_SECRET_KEY must stay a name.
    .replace(/(?<![\w\\])_(?=\S)([^_\n]+?)_(?![\w])/g, '<em>$1</em>')

/** One run of text. Code spans are kept apart, so nothing inside them is read as Markdown. */
const inline = (raw: string) =>
  raw
    .split(/`([^`\n]+)`/)
    .map((part, index) => (isCapture(index) ? `<code>${escapeHtml(part)}</code>` : emphasise(unlink(escapeHtml(part)))))
    .join('')

const LIST_ITEM = /^\s{0,3}(?:[-*+]|\d{1,3}[.)])\s+/

const ORDERED_ITEM = /^\s{0,3}\d{1,3}[.)]\s+/

const HEADING = /^\s{0,3}#{1,6}\s+/

const QUOTE = /^\s{0,3}>\s?/

const renderBlock = (block: string) => {
  const lines = block.split('\n')
  if (lines.every(line => LIST_ITEM.test(line))) {
    const tag = lines.every(line => ORDERED_ITEM.test(line)) ? 'ol' : 'ul'
    return `<${tag}>${lines.map(line => `<li>${inline(line.replace(LIST_ITEM, ''))}</li>`).join('')}</${tag}>`
  }
  if (lines.length === 1 && HEADING.test(block)) return `<p><strong>${inline(block.replace(HEADING, ''))}</strong></p>`
  if (lines.every(line => QUOTE.test(line))) {
    return `<blockquote>${lines.map(line => inline(line.replace(QUOTE, ''))).join('<br>')}</blockquote>`
  }
  return `<p>${lines.map(inline).join('<br>')}</p>`
}

const renderProse = (prose: string) =>
  prose
    .split(/\n[ \t]*\n/)
    .map(block => block.replace(/^\n+|\n+$/g, ''))
    .filter(block => block.trim() !== '')
    .map(renderBlock)

const FENCE = /^```[^\n]*\n([\s\S]*?)\n?```[ \t]*$/m

/** Renders the agent's reason. The result holds no attribute and no tag outside a short list. */
export const renderMarkdown = (source: string) =>
  source
    .replace(/\r\n?/g, '\n')
    .split(FENCE)
    .flatMap((part, index) => (isCapture(index) ? [`<pre><code>${escapeHtml(part)}</code></pre>`] : renderProse(part)))
    .join('\n')
