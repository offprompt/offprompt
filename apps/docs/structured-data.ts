/**
 * Gives a page's questions and steps to search engines and assistants as JSON-LD, taken from
 * what the page already says so the two cannot drift apart. A heading below the title with a
 * question mark in it is a question, answered by the paragraphs and lists up to the next heading
 * of its level or above. Steps written `:::steps{data-howto="true"}` are the page's how-to, named
 * by its title. Vocs runs rehype plugins only on the pages it renders, so the Markdown it makes
 * for search and llms.txt never carries the script.
 */
import type { Element, ElementContent, Root, RootContent } from 'hast'

type Node = Root | RootContent | ElementContent

const HEADINGS = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']

/** What an answer or a step is read from: its prose, without its code blocks. */
const PROSE = new Set(['p', 'ul', 'ol', 'blockquote'])

const isElement = (node: Node): node is Element => node.type === 'element'

const isHeading = (node: Node): node is Element => isElement(node) && HEADINGS.includes(node.tagName)

const depthOf = (heading: Element) => Number(heading.tagName.slice(1))

const textOf = (node: Node): string => {
  if (node.type === 'text') return node.value
  if (node.type !== 'element' && node.type !== 'root') return ''
  const separator = isElement(node) && node.tagName === 'li' ? ' ' : ''
  return node.children.map(textOf).join('') + separator
}

const squeezed = (text: string) => text.replaceAll(/\s+/g, ' ').trim()

/** The prose of nodes, as one line of text. */
const proseOf = (nodes: readonly Node[]) =>
  squeezed(
    nodes
      .filter(isElement)
      .filter(node => PROSE.has(node.tagName))
      .map(textOf)
      .join(' '),
  )

/** The nodes after the one at `index`, up to the next heading of `depth` or above. */
const sectionAfter = ({ nodes, index, depth }: { nodes: readonly Node[]; index: number; depth: number }) => {
  const rest = nodes.slice(index + 1)
  const end = rest.findIndex(node => isHeading(node) && depthOf(node) <= depth)
  return end === -1 ? rest : rest.slice(0, end)
}

const questionsOf = (tree: Root) =>
  tree.children.flatMap((node, index) => {
    if (!isHeading(node) || depthOf(node) === 1) return []
    const question = squeezed(textOf(node))
    if (!question.includes('?')) return []
    const answer = proseOf(sectionAfter({ nodes: tree.children, index, depth: depthOf(node) }))
    return answer === '' ? [] : [{ question, answer }]
  })

const isHowTo = (node: Node): node is Element =>
  isElement(node) && (node.properties['data-howto'] !== undefined || node.properties['dataHowto'] !== undefined)

/** Each step of the page's how-to: Vocs gives every step a block of its own, its heading first. */
const stepsOf = (tree: Root) =>
  tree.children
    .filter(isHowTo)
    .flatMap(steps => steps.children.filter(isElement))
    .flatMap(step => {
      const [title, ...body] = step.children
      if (title === undefined || !isHeading(title)) return []
      return [{ name: squeezed(textOf(title)), text: proseOf(body) }]
    })

const faqPage = (questions: ReturnType<typeof questionsOf>) => ({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: questions.map(({ question, answer }) => ({
    '@type': 'Question',
    name: question,
    acceptedAnswer: { '@type': 'Answer', text: answer },
  })),
})

const howTo = ({ name, steps }: { name: string; steps: ReturnType<typeof stepsOf> }) => ({
  '@context': 'https://schema.org',
  '@type': 'HowTo',
  name,
  step: steps.map(({ name, text }, index) => ({ '@type': 'HowToStep', position: index + 1, name, text })),
})

/** A JSON-LD script. JSON in a script tag ends at the first "</script", so every < is escaped. */
const script = (data: object): Element => ({
  type: 'element',
  tagName: 'script',
  properties: { type: 'application/ld+json' },
  children: [{ type: 'text', value: JSON.stringify(data).replaceAll('<', '\\u003c') }],
})

/** The rehype plugin: a script of each kind the page has, after its content. */
export const structuredData = () => (tree: Root) => {
  const questions = questionsOf(tree)
  const steps = stepsOf(tree)
  const title = tree.children.find(node => isHeading(node) && depthOf(node) === 1)
  tree.children.push(
    ...(questions.length === 0 ? [] : [script(faqPage(questions))]),
    ...(steps.length === 0 || title === undefined ? [] : [script(howTo({ name: squeezed(textOf(title)), steps }))]),
  )
}
