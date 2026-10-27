import type { Metadata } from 'next'

import { alt, contentType, size } from '@/app/opengraph-image'
import { DOCS } from '@/lib/site'

/** The homepage's title: the name, beside what it is, for a search that has not met it. */
export const TITLE = 'offprompt: an MCP server that keeps API keys out of the chat'

/** What search results show under the homepage's title, kept to the 160 or so characters they show. */
export const DESCRIPTION =
  'Paste an API key into the chat and it stays in the transcript. offprompt, an MCP server, opens a page in your browser instead and writes the key to the file.'

// The docs' video of offprompt at work, recorded from its page (apps/docs/scripts/video.mjs).
// iMessage plays it in a link's preview and Discord offers to; every other app shows the card.
const VIDEO = { url: `${DOCS}/videos/how-it-works.mp4`, type: 'video/mp4', width: 1920, height: 1080 }

// The site's card. Next adds it by itself only to pages that set no openGraph of their own.
const CARD = { url: '/opengraph-image', alt, type: contentType, ...size }

type Page = {
  readonly path: string
  readonly title: string
  readonly description: string
  /** The title a link preview shows, where it differs from the page's own. */
  readonly share?: string
}

/**
 * A page's title and description, with its own address as its canonical one and its link
 * preview's. Next replaces a parent's openGraph and twitter whole rather than merging them, so
 * each page carries everything its preview shows.
 */
export const pageMetadata = ({ path, title, description, share = title }: Page): Metadata => ({
  title,
  description,
  alternates: { canonical: path },
  openGraph: {
    title: share,
    description,
    url: path,
    siteName: 'offprompt',
    type: 'website',
    images: [CARD],
    videos: [VIDEO],
  },
  twitter: { card: 'summary_large_image', title: share, description, images: [CARD] },
})
