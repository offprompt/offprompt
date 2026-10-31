import type { MetadataRoute } from 'next'

import { GUIDE_PAGES, INDEX } from '@/lib/guides'
import { COMPARE, PLAYGROUND, SITE } from '@/lib/site'

/** The site's pages. The docs, on their own host, have a sitemap of their own. */
const sitemap = (): MetadataRoute.Sitemap =>
  ['/', PLAYGROUND.href, COMPARE.href, INDEX.path, ...GUIDE_PAGES.map(guide => guide.path), '/privacy'].map(path => ({ url: new URL(path, SITE).href }))

export default sitemap
