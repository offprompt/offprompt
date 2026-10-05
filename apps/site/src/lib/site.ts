/** offprompt.dev, built from apps/site. */
export const SITE = 'https://offprompt.dev'

/** The public repository, where the changelog and security policy live. */
export const REPO = 'https://github.com/offprompt/offprompt'

/** docs.offprompt.dev, built from apps/docs. */
export const DOCS = 'https://docs.offprompt.dev'

export const NPM = 'https://www.npmjs.com/package/offprompt'

export const INSTALL = 'npx offprompt init'

export type Link = { readonly label: string; readonly href: string }

/** Where offprompt's own page can be tried, with a stand-in for its server. */
export const PLAYGROUND: Link = { label: 'Playground', href: '/playground' }

export const NAV: readonly Link[] = [
  { label: 'How it works', href: '/#how-it-works' },
  { label: 'Rich fields', href: '/#rich-fields' },
  { label: 'Security', href: '/#security' },
  { label: 'Docs', href: `${DOCS}/introduction` },
  { label: 'Changelog', href: `${REPO}/releases` },
]

export const FOOTER: readonly { readonly head: string; readonly links: readonly Link[] }[] = [
  {
    head: 'Product',
    links: [
      { label: 'How it works', href: '/#how-it-works' },
      PLAYGROUND,
      { label: 'Rich fields', href: '/#rich-fields' },
      { label: 'Changelog', href: `${REPO}/releases` },
      { label: 'Roadmap', href: `${REPO}/blob/main/DESIGN.md#roadmap` },
    ],
  },
  {
    head: 'Developers',
    links: [
      { label: 'Docs', href: `${DOCS}/introduction` },
      { label: 'GitHub', href: REPO },
      { label: 'npm', href: NPM },
      { label: 'Registry', href: `${DOCS}/reference/providers` },
      { label: 'Plugin', href: `${REPO}/tree/main/packages/install/plugin` },
    ],
  },
  {
    head: 'Legal',
    links: [
      { label: 'MIT license', href: `${REPO}/blob/main/LICENSE` },
      { label: 'Security', href: `${REPO}/security/policy` },
      { label: 'Privacy', href: '/privacy' },
      { label: 'Third-party notices', href: '/third-party-notices.txt' },
    ],
  },
]

export const SECURITY_NOTES = `${DOCS}/security/threat-model`
