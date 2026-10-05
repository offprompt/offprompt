import { describe, expect, it } from 'vitest'

import { renderMarkdown } from '../src/web/markdown.js'

describe('formatting an agent writes', () => {
  it('renders bold, italic and inline code', () => {
    expect(renderMarkdown('This is **bold**, *italic* and `code`.')).toBe(
      '<p>This is <strong>bold</strong>, <em>italic</em> and <code>code</code>.</p>',
    )
  })

  it('renders a list', () => {
    expect(renderMarkdown('- the webhook handler\n- the checkout page')).toBe(
      '<ul><li>the webhook handler</li><li>the checkout page</li></ul>',
    )
  })

  it('renders a numbered list', () => {
    expect(renderMarkdown('1. open the dashboard\n2. copy the key')).toBe(
      '<ol><li>open the dashboard</li><li>copy the key</li></ol>',
    )
  })

  it('separates paragraphs on a blank line and keeps single line breaks', () => {
    expect(renderMarkdown('First line\nsecond line\n\nNew paragraph')).toBe(
      '<p>First line<br>second line</p>\n<p>New paragraph</p>',
    )
  })

  it('renders a fenced code block without reading Markdown inside it', () => {
    expect(renderMarkdown('Set it like this:\n\n```sh\nexport **NOT_BOLD**=1\n```')).toBe(
      '<p>Set it like this:</p>\n<pre><code>export **NOT_BOLD**=1</code></pre>',
    )
  })

  it('does not read Markdown inside an inline code span', () => {
    expect(renderMarkdown('run `a **b** c`')).toBe('<p>run <code>a **b** c</code></p>')
  })

  it('renders a heading as a bold line, sized for a small panel', () => {
    expect(renderMarkdown('## Why')).toBe('<p><strong>Why</strong></p>')
  })

  it('renders a quote', () => {
    expect(renderMarkdown('> from the Stripe docs')).toBe('<blockquote>from the Stripe docs</blockquote>')
  })
})

describe('env names survive', () => {
  it('does not turn the underscores in a key name into italics', () => {
    expect(renderMarkdown('Needs STRIPE_SECRET_KEY and API_KEY_ID.')).toBe(
      '<p>Needs STRIPE_SECRET_KEY and API_KEY_ID.</p>',
    )
  })

  it('still reads a whole word in underscores as italic', () => {
    expect(renderMarkdown('this is _important_ here')).toBe('<p>this is <em>important</em> here</p>')
  })

  it('does not turn the asterisks in a glob into italics', () => {
    expect(renderMarkdown('matches *.env and src/**/*.ts')).not.toContain('<em>')
  })
})

describe('nothing an agent writes can become markup', () => {
  it('shows raw HTML as text', () => {
    expect(renderMarkdown('<script>alert(1)</script>')).toBe('<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>')
  })

  it('escapes HTML inside formatting', () => {
    expect(renderMarkdown('**<img src=x onerror=alert(1)>**')).toBe(
      '<p><strong>&lt;img src=x onerror=alert(1)&gt;</strong></p>',
    )
  })

  it('escapes HTML inside code', () => {
    expect(renderMarkdown('`<b>`\n\n```\n</code><script>\n```')).toBe(
      '<p><code>&lt;b&gt;</code></p>\n<pre><code>&lt;/code&gt;&lt;script&gt;</code></pre>',
    )
  })

  it('shows a link as its label and target, not as something to click', () => {
    const html = renderMarkdown('Get it from [the dashboard](https://dashboard.stripe.com/apikeys).')
    expect(html).toBe('<p>Get it from the dashboard (https://dashboard.stripe.com/apikeys).</p>')
    expect(html).not.toContain('<a')
  })

  it('does not make a javascript: link clickable either', () => {
    const html = renderMarkdown('[click](javascript:alert(1))')
    expect(html).not.toContain('<a')
    expect(html).not.toContain('href')
  })

  it('shows an image as text rather than loading it', () => {
    expect(renderMarkdown('![tracker](https://evil.example/pixel.png)')).toBe(
      '<p>tracker (https://evil.example/pixel.png)</p>',
    )
  })

  it('never emits a tag with an attribute', () => {
    const hostile = [
      '<a href="x">x</a>',
      '[x](x" onclick="alert(1))',
      '**"><svg onload=alert(1)>**',
      '- <iframe src=x>\n- `"><script>`',
      '> <style>body{display:none}</style>',
    ].join('\n\n')
    expect(renderMarkdown(hostile)).not.toMatch(/<[a-z]+\s+[a-z-]+=/i)
  })

  it('renders only tags from the short list', () => {
    const tags = renderMarkdown('**a** *b* `c`\n\n- d\n\n1. e\n\n> f\n\n```\ng\n```').match(/<\/?([a-z]+)/g) ?? []
    const allowed = new Set(['p', 'br', 'strong', 'em', 'code', 'pre', 'ul', 'ol', 'li', 'blockquote'])
    expect(tags.map(tag => tag.replace(/[</]/g, '')).filter(tag => !allowed.has(tag))).toEqual([])
  })
})
