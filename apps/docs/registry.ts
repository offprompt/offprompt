/**
 * Fills the reference pages from offprompt's own registry as the docs build, so they list
 * exactly the providers, keys, rules and formats the tool accepts. A page asks for one with
 * a line of its own, `::formats`, or `::provider-ask{id="stripe"}` and `::provider-keys{id="stripe"}`
 * on a provider's page, and the lists land in its Markdown, where search and llms.txt read
 * them too.
 */
import type { Heading, List, Nodes, Paragraph, PhrasingContent, Root, RootContent, Table, TableRow } from 'mdast'
import type { LeafDirective } from 'mdast-util-directive'
import { gfmTableToMarkdown } from 'mdast-util-gfm-table'
import { formats, providers, type Credential, type Format, type Provider } from 'offprompt/showcase'
import type { Processor } from 'unified'

type Cell = readonly PhrasingContent[]

const text = (value: string): PhrasingContent => ({ type: 'text', value })

const code = (value: string): PhrasingContent => ({ type: 'inlineCode', value })

/** A link that reads as its address without the scheme, such as dashboard.stripe.com/apikeys. */
const address = (url: string): PhrasingContent => {
  const { host, pathname } = new URL(url)
  return { type: 'link', url, children: [text(pathname === '/' ? host : `${host}${pathname}`)] }
}

const paragraph = (...children: PhrasingContent[]): Paragraph => ({ type: 'paragraph', children })

const heading = ({ depth, value }: { depth: 2 | 3; value: string }): Heading => ({
  type: 'heading',
  depth,
  children: [text(value)],
})

/** Nodes with a separator between each two. */
const joined = ({ nodes, separator }: { nodes: readonly PhrasingContent[]; separator: string }) =>
  nodes.flatMap((node, index) => (index === 0 ? [node] : [text(separator), node]))

/** Words with commas between them and "and" before the last. */
const listed = (nodes: readonly PhrasingContent[]) =>
  nodes.flatMap((node, index) => {
    if (index === 0) return [node]
    return [text(index === nodes.length - 1 ? ' and ' : ', '), node]
  })

const row = (cells: readonly Cell[]): TableRow => ({
  type: 'tableRow',
  children: cells.map(cell => ({ type: 'tableCell', children: [...cell] })),
})

const table = ({ head, rows }: { head: readonly string[]; rows: readonly (readonly Cell[])[] }): Table => ({
  type: 'table',
  align: head.map(() => null),
  children: [row(head.map(title => [text(title)])), ...rows.map(row)],
})

const list = (items: readonly string[]): List => ({
  type: 'list',
  ordered: false,
  spread: false,
  children: items.map(item => ({ type: 'listItem', spread: false, children: [paragraph(text(item))] })),
})

/**
 * A key's checks, each line as the field under it on offprompt's page says it once it passes:
 * a check mark, then the rule, capitalised. Search and llms.txt read a plain list.
 */
const checks = (messages: readonly string[]): List => ({
  ...list(messages.map(message => `${message.charAt(0).toUpperCase()}${message.slice(1)}`)),
  data: { hProperties: { className: ['offprompt-checks'] } },
})

const formatList: readonly Format[] = formats

const formatLabel = (id: string) => formatList.find(format => format.id === id)?.label ?? id

/** What an agent passes to ask for a key under a name offprompt does not know. */
const askedWith = ({ provider, credential }: { provider: Provider; credential: Credential }) =>
  code(`provider: "${provider.credentials.length > 1 ? `${provider.id}/${credential.id}` : provider.id}"`)

/**
 * How an agent asks for this provider's keys: by a name projects usually read the key under,
 * which offprompt knows the key by, or under any other name with `provider`.
 */
const asking = (provider: Provider): Paragraph => {
  const [first, second] = provider.credentials
  if (first === undefined) return paragraph(text(`${provider.name} issues no key offprompt asks for.`))
  const [name, other] = first.names
  const usual = [text(other === undefined ? '' : 'such as '), code(name ?? '')]
  if (second === undefined) {
    return paragraph(
      text('An agent asks for this key by its usual variable name, '),
      ...usual,
      text(', and offprompt knows the key from the name. Under any other name, the agent adds '),
      askedWith({ provider, credential: first }),
      text('.'),
    )
  }
  return paragraph(
    text('An agent asks for one of these keys by its usual variable name, '),
    ...usual,
    text(', and offprompt knows from the name which key it is. Under any other name, the agent says which with '),
    askedWith({ provider, credential: second }),
    text(' or the like.'),
  )
}

const keyTable = (provider: Provider) =>
  table({
    head: ['Key', 'Usual names', 'Under any other name'],
    rows: provider.credentials.map(credential => [
      [text(credential.secret === false ? `${credential.label}, shown in the clear` : credential.label)],
      joined({ nodes: credential.names.map(code), separator: ', ' }),
      [askedWith({ provider, credential })],
    ]),
  })

/** One key: where it is made, what it looks like, and every check it has to pass. */
const credentialBlock = (credential: Credential): RootContent[] => [
  heading({ depth: 2, value: credential.label }),
  paragraph(
    text('Made at '),
    address(credential.url),
    ...(credential.placeholder === undefined ? [text('.')] : [text('. Looks like '), code(credential.placeholder), text('.')]),
  ),
  credential.rules.length === 0
    ? paragraph(text('No checks: any value is taken.'))
    : checks(credential.rules.map(rule => rule.message)),
]

const offerLines = (provider: Provider) =>
  provider.offers.map(offer =>
    paragraph(
      text('A '),
      code(offer.format),
      text(` field links here for someone who has no ${formatLabel(offer.format)} yet: `),
      address(offer.url),
      text('.'),
    ),
  )

/** A provider in the registry, by the id a page names it with. A name it no longer has fails the build. */
const providerOf = (id: string | null | undefined) => {
  const found = providers.find(candidate => candidate.id === id)
  if (found === undefined) throw new Error(`offprompt's registry has no provider ${String(id)}`)
  return found
}

/** How a provider's keys are asked for, and the formats it makes, at the top of its page. */
const providerAsk = (provider: Provider): RootContent[] => [asking(provider), ...offerLines(provider)]

/** Every key a provider issues: what each is asked as and read as, then where each is made and its checks. */
const providerKeys = (provider: Provider): RootContent[] =>
  provider.credentials.length === 0 ? [] : [keyTable(provider), ...provider.credentials.flatMap(credentialBlock)]

const fieldOf = (format: Format) =>
  format.multiline === true ? 'several lines, in the clear, with a file picker' : 'one line, masked'

const offersOf = (format: Format) =>
  providers.flatMap(provider =>
    provider.offers
      .filter(offer => offer.format === format.id)
      .map((offer): PhrasingContent => ({ type: 'link', url: offer.url, children: [text(provider.name)] })),
  )

const creatable = (format: Format) => {
  const offers = offersOf(format)
  return offers.length === 0
    ? []
    : [
        paragraph(
          text('A '),
          code(format.id),
          text(' field links to '),
          ...listed(offers),
          text(`, where someone who has no ${formatLabel(format.id)} yet can create one.`),
        ),
      ]
}

const formatBlocks = (): RootContent[] => [
  table({
    head: ['Format', 'What it is', 'Checks', 'Field'],
    rows: formatList.map(format => [
      [code(format.id)],
      [text(format.label ?? 'anything')],
      [text(format.rules.length === 0 ? 'none' : format.rules.map(rule => rule.message).join('; '))],
      [text(fieldOf(format))],
    ]),
  }),
  ...formatList.flatMap(creatable),
]

type Attributes = LeafDirective['attributes']

const EXPANSIONS: ReadonlyMap<string, (attributes: Attributes) => RootContent[]> = new Map([
  ['provider-ask', (attributes: Attributes) => providerAsk(providerOf(attributes?.id))],
  ['provider-keys', (attributes: Attributes) => providerKeys(providerOf(attributes?.id))],
  ['formats', formatBlocks],
])

const isLeafDirective = (node: RootContent): node is LeafDirective => node.type === 'leafDirective'

/**
 * Vocs styles only elements marked `data-v`, a mark its own pass gave every node before these
 * existed, so they get it here.
 */
const scope = (node: Nodes) => {
  node.data = { ...node.data, hProperties: { ...node.data?.hProperties, 'data-v': '' } }
  if ('children' in node) node.children.forEach(scope)
}

const expand = (node: RootContent) => {
  if (!isLeafDirective(node)) return [node]
  const expansion = EXPANSIONS.get(node.name)
  if (expansion === undefined) return [node]
  const nodes = expansion(node.attributes)
  nodes.forEach(scope)
  return nodes
}

/**
 * The remark plugin: each line naming an expansion becomes the lists it names. Vocs
 * also prints every page back to Markdown, for search and llms.txt, with a printer that knows
 * no tables, so the plugin teaches it the ones it adds. A plugin reaches the processor as
 * `this`, which an arrow function cannot take.
 */
export const registryLists = function (this: Processor) {
  const data = this.data()
  data.toMarkdownExtensions = [...(data.toMarkdownExtensions ?? []), gfmTableToMarkdown()]
  return (tree: Root) => {
    tree.children = tree.children.flatMap(expand)
  }
}
