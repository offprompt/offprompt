import type { MetadataRoute } from 'next'

import { PLAYGROUND, SITE } from '@/lib/site'

/** The site's pages. The docs, on their own host, have a sitemap of their own. */
const sitemap = (): MetadataRoute.Sitemap =>
  ['/', PLAYGROUND.href, '/privacy'].map(path => ({ url: new URL(path, SITE).href }))

export default sitemap
