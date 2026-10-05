import { expect, it } from 'vitest'

import { escapeHtml } from '../src/web/html.js'

it('escapes every character that could close an attribute or open a tag', () => {
  expect(escapeHtml(`<script>alert("x" + 'y')</script> & more`)).toBe(
    '&lt;script&gt;alert(&quot;x&quot; + &#39;y&#39;)&lt;/script&gt; &amp; more',
  )
})

it('leaves ordinary text alone', () => {
  expect(escapeHtml('The email sender reads it at startup.')).toBe('The email sender reads it at startup.')
})

it('escapes the ampersand first so an entity cannot be forged', () => {
  expect(escapeHtml('&lt;img&gt;')).toBe('&amp;lt;img&amp;gt;')
})
