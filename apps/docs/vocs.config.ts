import { categoryLabels, providers } from 'offprompt/showcase'
import { defineConfig } from 'vocs/config'

import redirects from './redirects.json' with { type: 'json' }
import { registryLists } from './registry.ts'

/** The public repository, as offprompt.dev links it. */
const REPO = 'https://github.com/offprompt/offprompt'

/** A folded group per category, each provider's page in it by name. */
const providerGroups = Object.entries(categoryLabels)
  .map(([category, label]) => ({
    text: label,
    collapsed: true,
    items: providers
      .filter(provider => provider.category === category)
      .toSorted((left, right) => left.name.localeCompare(right.name))
      .map(provider => ({ text: provider.name, link: `/reference/providers/${provider.id}` })),
  }))
  .filter(group => group.items.length > 0)

export default defineConfig({
  title: 'offprompt',
  description: 'Hand a secret to a coding agent without the secret entering the transcript.',
  baseUrl: 'https://docs.offprompt.dev',
  // The address is for the sitemap and canonical links. A <base> tag would send every relative
  // request, a preview's included, to the live site.
  head: { base: false },
  // The docs open on the introduction: there is no page of their own at the root.
  redirects,
  iconUrl: '/icon.svg',
  accentColor: 'light-dark(#2B4A3B, #7CF5C2)',
  renderStrategy: 'full-static',
  editLink: {
    // A provider's page is written from the registry at build time and not kept in git, so its
    // link opens the provider's folder in the registry. Vocs sends this function to the browser
    // as its source text, so it names nothing from outside itself, REPO included.
    link: (path: string) => {
      const provider = /^reference\/providers\/([a-z0-9-]+)\.mdx$/.exec(path)?.[1]
      return provider === undefined
        ? `https://github.com/offprompt/offprompt/edit/main/apps/docs/src/pages/${path}`
        : `https://github.com/offprompt/offprompt/tree/main/packages/offprompt/src/registry/providers/${provider}`
    },
    text: 'Suggest a change to this page',
  },
  socials: [{ icon: 'github', link: REPO }],
  markdown: { remarkPlugins: [registryLists] },
  topNav: [
    { text: 'Guide', link: '/introduction' },
    { text: 'Reference', link: '/reference/collect-secret', match: '/reference' },
    { text: 'Security', link: '/security/threat-model', match: '/security' },
    { text: 'offprompt.dev', link: 'https://offprompt.dev', external: true },
  ],
  sidebar: [
    {
      text: 'Getting started',
      items: [
        { text: 'Introduction', link: '/introduction' },
        { text: 'Installation', link: '/installation' },
        { text: 'Your first secret', link: '/first-secret' },
      ],
    },
    {
      text: 'Guides',
      items: [
        { text: 'The page', link: '/guides/the-page' },
        { text: 'Asking for values', link: '/guides/asking-for-values' },
        { text: 'The fingerprint', link: '/guides/fingerprint' },
        { text: 'Values you already keep', link: '/guides/stores' },
        { text: 'Cloud sandboxes', link: '/guides/cloud-sandboxes' },
        { text: 'Agents', link: '/guides/agents' },
      ],
    },
    {
      text: 'Reference',
      items: [
        { text: 'collect_secret', link: '/reference/collect-secret' },
        { text: 'await_secret', link: '/reference/await-secret' },
        { text: 'cancel_secret', link: '/reference/cancel-secret' },
        { text: 'Sinks', link: '/reference/sinks' },
        { text: 'Providers', link: '/reference/providers', collapsed: true, items: providerGroups },
        { text: 'Formats', link: '/reference/formats' },
        { text: 'Command line', link: '/reference/cli' },
        { text: 'Environment', link: '/reference/environment' },
      ],
    },
    {
      text: 'Security',
      items: [
        { text: 'Threat model', link: '/security/threat-model' },
        { text: 'The local server', link: '/security/local-server' },
        { text: 'Sealed values', link: '/security/sealed-values' },
      ],
    },
    {
      text: 'More',
      items: [
        { text: 'FAQ', link: '/faq' },
        { text: 'Troubleshooting', link: '/troubleshooting' },
        { text: 'Adding a provider', link: '/adding-a-provider' },
      ],
    },
  ],
})
