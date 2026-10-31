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

/** What happens to a key pasted into an agent's chat, and the guides for one provider at a time. */
export const GUIDES: Link = { label: 'Guides', href: '/guides/paste-api-key-into-ai-agent' }

/** offprompt beside the tools people weigh it against. */
export const COMPARE: Link = { label: 'Compare', href: '/compare' }

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
      COMPARE,
      { label: 'Rich fields', href: '/#rich-fields' },
      { label: 'Changelog', href: `${REPO}/releases` },
      { label: 'Roadmap', href: `${REPO}/blob/main/DESIGN.md#roadmap` },
    ],
  },
  {
    head: 'Developers',
    links: [
      { label: 'Docs', href: `${DOCS}/introduction` },
      GUIDES,
      { label: 'API keys and agents', href: `${DOCS}/guides/claude-code-api-keys` },
      { label: 'API keys in Cursor', href: `${DOCS}/guides/cursor-api-keys` },
      { label: 'Secrets and agent context', href: `${DOCS}/guides/keep-secrets-out-of-agent-context` },
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
