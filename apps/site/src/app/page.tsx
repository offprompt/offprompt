import type { Metadata } from 'next'

import { JsonLd } from '@/components/json-ld'
import { Cta } from '@/components/sections/cta'
import { Hero } from '@/components/sections/hero'
import { HowItWorks } from '@/components/sections/how-it-works'
import { Schemas } from '@/components/sections/schemas'
import { Security } from '@/components/sections/security'
import { Shell } from '@/components/shell'
import { DESCRIPTION, pageMetadata, TITLE } from '@/lib/metadata'
import { DOCS, NPM, REPO, SITE } from '@/lib/site'

export const metadata: Metadata = pageMetadata({
  path: '/',
  title: TITLE,
  description: DESCRIPTION,
  share: 'Keep secrets off the prompt.',
})

/**
 * What offprompt is, for search engines: the name tied to the repository and the npm package,
 * so a search for it can tell it from the phrase "off prompt".
 */
const SOFTWARE = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'offprompt',
  description: DESCRIPTION,
  url: SITE,
  applicationCategory: 'DeveloperApplication',
  operatingSystem: 'macOS, Linux, Windows',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  license: 'https://opensource.org/licenses/MIT',
  softwareHelp: { '@type': 'CreativeWork', url: `${DOCS}/introduction` },
  downloadUrl: NPM,
  sameAs: [REPO, NPM],
}

const Home = () => (
  <Shell>
    <JsonLd data={SOFTWARE} />
    <Hero />
    <HowItWorks />
    <Schemas />
    <Security />
    <Cta />
  </Shell>
)

export default Home
