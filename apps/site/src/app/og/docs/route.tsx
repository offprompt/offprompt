import { ImageResponse } from 'next/og'
import type { NextRequest } from 'next/server'

import { DocsCard } from '@/og/cards'
import { cardFonts } from '@/og/fonts'

/** The longest a slot is taken, well past what its lines can show. */
const LONGEST = 300

/** A slot from the query, trimmed, or the fallback when the page gave none. */
const slot = (request: NextRequest, name: string, fallback: string) =>
  (request.nextUrl.searchParams.get(name) ?? fallback).trim().slice(0, LONGEST)

/**
 * A docs page's card, which docs.offprompt.dev names in each page's og:image with the page's
 * section, title and description. The same query always draws the same card, so it is cached
 * for good.
 */
export const GET = async (request: NextRequest) =>
  new ImageResponse(
    (
      <DocsCard
        section={slot(request, 'section', 'Docs')}
        title={slot(request, 'title', 'offprompt')}
        description={slot(request, 'description', '')}
      />
    ),
    {
      width: 1200,
      height: 630,
      fonts: [...(await cardFonts())],
      headers: { 'cache-control': 'public, max-age=86400, s-maxage=31536000, immutable' },
    },
  )
