import type { MetadataRoute } from 'next'

import { SITE } from '@/lib/site'

/**
 * Everything may be crawled but the samples, which are offprompt's page as the landing page
 * frames it, and mean nothing on their own.
 */
const robots = (): MetadataRoute.Robots => ({
  rules: { userAgent: '*', allow: '/', disallow: '/samples/' },
  sitemap: `${SITE}/sitemap.xml`,
})

export default robots
