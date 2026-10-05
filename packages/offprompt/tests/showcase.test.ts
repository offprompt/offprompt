import { describe, expect, it } from 'vitest'

import { DEMO, samplePage, type Sample } from '../src/showcase.js'

const SAMPLE: Sample = {
  asks: [
    { name: 'STRIPE_WEBHOOK_SECRET', provider: 'stripe' },
    { name: 'VERCEL_TOKEN', provider: 'vercel' },
  ],
  reason: 'It is adding Stripe webhook verification.',
  file: { kind: 'dotenv', path: '.env.local', holds: ['VERCEL_TOKEN'] },
  project: 'acme-api',
  asker: 'claude-code',
}

const scriptsOf = (html: string) =>
  [...html.matchAll(/<script nonce="showcase">([\s\S]*?)<\/script>/g)].map(match => match[1] ?? '')

describe('the page as the website shows it', () => {
  it('is the real form for the sample, with a field per key', () => {
    const html = samplePage(SAMPLE)
    expect(html).toContain('Claude Code is asking for two values.')
    expect(html).toContain('data-key="STRIPE_WEBHOOK_SECRET"')
    expect(html).toContain('data-key="VERCEL_TOKEN"')
    expect(html).toContain('Write to .env.local')
  })

  it('says a key the file already holds will be replaced', () => {
    expect(samplePage(SAMPLE)).toContain('Already in .env.local. Writing will replace the current value.')
  })

  it('names the agent without the environment it was rendered in', () => {
    expect(samplePage(SAMPLE)).not.toContain('in Conductor')
  })

  it('stands in for the server before the page script runs', () => {
    const [standin, page] = scriptsOf(samplePage(SAMPLE))
    expect(standin).toContain('window.fetch')
    expect(page?.length).toBeGreaterThan(1000)
  })

  it('types into a field after the page script, a key at a time', () => {
    const scripts = scriptsOf(
      samplePage({
        ...SAMPLE,
        typing: { key: 'STRIPE_WEBHOOK_SECRET', keystrokes: [{ type: 'whsec_' }, { random: 24 }], loop: true },
      }),
    )
    expect(scripts).toHaveLength(3)
    expect(scripts[2]).toContain('"key":"STRIPE_WEBHOOK_SECRET"')
    expect(scripts[2]).toContain('{"random":24}')
  })

  it('keeps what it types from closing its script', () => {
    const [, , typist] = scriptsOf(
      samplePage({ ...SAMPLE, typing: { key: 'VERCEL_TOKEN', keystrokes: [{ type: '</script><b>' }] } }),
    )
    expect(typist).toContain('\\u003c/script>\\u003cb>')
  })

  it('shows every value in the clear when asked, with the page\'s own switch', () => {
    expect(scriptsOf(samplePage({ ...SAMPLE, revealed: true })).join('\n')).toContain("getElementById('reveal-all')")
    expect(scriptsOf(samplePage(SAMPLE)).join('\n')).not.toContain("getElementById('reveal-all')")
  })

  it('shows the fields alone when asked', () => {
    expect(samplePage({ ...SAMPLE, view: 'fields' })).toContain('.values-head { display: none')
    expect(samplePage(SAMPLE)).not.toContain('.values-head { display: none')
  })

  it("leaves the agent's reason out of the brief page too, and keeps the heading and fields", () => {
    const html = samplePage({ ...SAMPLE, view: 'brief' })
    expect(html).toContain('.requester, .claim, section.import')
    expect(html).toContain('is asking for two values.')
    expect(html).toContain('data-key="VERCEL_TOKEN"')
  })

  it('leaves the paste card and footnotes out of the compact page, and keeps the fields', () => {
    const html = samplePage({ ...SAMPLE, view: 'compact' })
    expect(html).toContain('section.import')
    expect(html).toContain('data-key="STRIPE_WEBHOOK_SECRET"')
  })

  it('shows the page after the write, with its fingerprint and receipt', () => {
    const html = samplePage({ ...SAMPLE, written: '🍋 🥝 🌮 🧀' })
    expect(html).toContain('Written.')
    expect(html).toContain('<span class="name">lemon</span>')
    expect(html).toContain('Fingerprint')
    expect(html).toContain('a fingerprint of both values')
    expect(scriptsOf(html).join('\n')).toContain('data-needs-script')
  })

  it('shows the fingerprint alone only on a written page', () => {
    expect(samplePage({ ...SAMPLE, written: '🍋 🥝 🌮 🧀', view: 'fingerprint' })).toContain(
      'main > :not(.fingerprint)',
    )
    expect(() => samplePage({ ...SAMPLE, view: 'fingerprint' })).toThrow()
  })

  it('refuses a sample that names an unknown provider', () => {
    expect(() => samplePage({ ...SAMPLE, asks: [{ name: 'X_KEY', provider: 'nobody' }] })).toThrow()
  })
})

describe('the page to try', () => {
  it('asks for one value of each kind, in a file that already holds one', () => {
    const html = samplePage(DEMO)
    expect(html).toContain('data-key="STRIPE_SECRET_KEY"')
    expect(html).toContain('data-key="DATABASE_URL"')
    expect(html).toContain('data-key="AUTH_SECRET"')
    expect(html).toContain('Already in .env.local. Writing will replace the current value.')
  })

  it('stands in with the Written page it answers a write with', () => {
    const [standin] = scriptsOf(samplePage(DEMO))
    expect(standin).toContain('offpromptDemo.start(')
    expect(standin).toContain('Written.')
    expect(standin).toContain('sk_test_EXAMPLE')
  })

  it('carries the fonts once, in the page, not again in the Written page it holds', () => {
    expect(samplePage(DEMO).match(/@font-face/g)).toHaveLength(samplePage(SAMPLE).match(/@font-face/g)?.length ?? 0)
  })

  it('keeps the Written page it holds from closing its script', () => {
    const [standin] = scriptsOf(samplePage(DEMO))
    expect(standin).not.toContain('</')
  })

  it('hides every field but the one shown, where it shows one at a time', () => {
    expect(samplePage({ ...SAMPLE, demo: { single: true } })).toContain('.values .field[data-off] { display: none')
    expect(samplePage(DEMO)).not.toContain('.field[data-off]')
  })

  it('offers examples that pass the checks, and a mix-up that does not', () => {
    const examples = new Map(DEMO.demo?.examples)
    expect(examples.get('STRIPE_SECRET_KEY')).toMatch(/^sk_test_\w{22,}$/)
    expect(examples.get('DATABASE_URL')).toMatch(/^postgresql:\/\/\S+@\S+\/\w+$/)
    expect(DEMO.demo?.mixUp?.value).toMatch(/^pk_test_/)
  })
})
