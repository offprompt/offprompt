import { escapeHtml } from '../html.js'
import { MARK, page } from './shell.js'

/** What most closed pages leave the human to do. */
export const ASK_AGAIN = 'Ask the agent to request the value again.'

/** Shown for an expired, cancelled or exhausted record, and for an unknown token, with what to do next. */
export const renderClosed = ({ cspNonce, headline, next }: { cspNonce: string; headline: string; next: string }) =>
  page({
    title: 'offprompt — closed',
    cspNonce,
    host: undefined,
    status: '<p class="status" data-state="closed">Closed</p>',
    kind: 'closed',
    body: `<div class="hero-tile muted"><div>${MARK}</div></div>
<div class="hero"><h1 class="headline">${escapeHtml(headline)}</h1>${next === '' ? '' : `<p>${escapeHtml(next)}</p>`}</div>`,
  })
