import { expect, test as base, type Page } from '@playwright/test'

import { demoScript, fontFaces, pasteScript } from '../../scripts/build.mjs'

/**
 * The showcase embeds the page script, the demo's stand-in and the fonts through build-time
 * defines. Here nothing is bundled, so each is built and put where the defines would have
 * put it, before the showcase loads.
 */
const loadShowcase = async () => {
  Object.assign(globalThis, {
    OFFPROMPT_PASTE_SCRIPT: pasteScript(),
    OFFPROMPT_DEMO_SCRIPT: demoScript(),
    OFFPROMPT_FONT_FACES: fontFaces(),
  })
  return import('../../src/showcase.js')
}

/** Where the site is served from here: https, so the page in the frame has WebCrypto. */
const SITE = 'https://site.test'

/**
 * The page to try as a website shows it: in a sandboxed frame that may run scripts and
 * nothing else, on a page that sends it messages and keeps what the frame reports.
 */
const test = base.extend<{ demo: { frame: ReturnType<Page['frameLocator']>; send: (message: object) => Promise<void> } }>({
  demo: async ({ page }, use) => {
    const { DEMO, samplePage } = await loadShowcase()
    await page.route(`${SITE}/`, route =>
      route.fulfill({
        contentType: 'text/html',
        body: `<!doctype html><title>site</title>
<iframe id="demo" src="/try" sandbox="allow-scripts" style="width:720px;height:1400px"></iframe>
<script>window.reports = []; addEventListener('message', event => window.reports.push(event.data));</script>`,
      }),
    )
    await page.route(`${SITE}/try`, route => route.fulfill({ contentType: 'text/html', body: samplePage(DEMO) }))
    await page.goto(`${SITE}/`)
    const frame = page.frameLocator('#demo')
    await expect(frame.locator('textarea[data-key="AUTH_SECRET"]')).not.toHaveValue('')
    const send = (message: object) =>
      page.evaluate(sent => {
        const target = document.querySelector('iframe')?.contentWindow
        target?.postMessage(sent, '*')
      }, message)
    await use({ frame, send })
  },
})

type Report = { readonly offprompt: string; readonly px?: number }

const reportsOf = (page: Page) => page.evaluate(() => (window as unknown as { reports: Report[] }).reports)

/** What the frame reported, by kind. */
const saidOf = async (page: Page) => (await reportsOf(page)).map(report => report.offprompt)

/** The last height the frame reported. */
const heightOf = async (page: Page) => (await reportsOf(page)).filter(report => report.offprompt === 'height').at(-1)?.px

/** The four in the page's tiles, and the four the agent's side of it shows. */
const fourOf = async (frame: ReturnType<Page['frameLocator']>) => ({
  page: await frame.locator('ul.emoji').getAttribute('aria-label'),
  agent: (await frame.locator('.terminal .chip .glyphs').allTextContents()).join(' '),
})

test("fills the examples through the page's own Choose file, and the page says so", async ({ demo }) => {
  await demo.send({ offprompt: 'fill' })
  await expect(demo.frame.locator('textarea[data-key="STRIPE_SECRET_KEY"]')).toHaveValue(/^sk_test_EXAMPLE/)
  await expect(demo.frame.locator('textarea[data-key="DATABASE_URL"]')).toHaveValue(/^postgresql:\/\//)
  await expect(demo.frame.getByText('Filled 2 fields from examples.env')).toBeVisible()
})

test('writes, and shows the same four on the page and on the agent side', async ({ demo, page }) => {
  await demo.send({ offprompt: 'fill' })
  await demo.frame.locator('[data-submit]').click()
  await expect(demo.frame.locator('main h1')).toHaveText('Written.')

  const four = await fourOf(demo.frame)
  expect(four.page).toMatch(/^\S+ \S+ \S+ \S+$/)
  expect(four.agent).toBe(four.page)
  await expect(demo.frame.locator('[data-mismatch]')).toBeHidden()
  expect(await saidOf(page)).toContain('written')
})

test('says the file holds something else when it does', async ({ demo }) => {
  await demo.send({ offprompt: 'mismatch', on: true })
  await demo.send({ offprompt: 'fill' })
  await demo.frame.locator('[data-submit]').click()

  await expect(demo.frame.locator('[data-mismatch]')).toBeVisible()
  const four = await fourOf(demo.frame)
  expect(four.agent).not.toBe(four.page)
})

test('names the key that was pasted in the wrong place', async ({ demo }) => {
  await demo.send({ offprompt: 'mix-up' })
  await expect(demo.frame.getByText("That's the publishable key.", { exact: false })).toBeVisible()
})

test('tells the site when a field holds a value of its own', async ({ demo, page }) => {
  await demo.frame.locator('textarea[data-key="STRIPE_SECRET_KEY"]').fill('sk_test_not-one-of-the-examples-at-all')
  await expect.poll(() => saidOf(page)).toContain('own-value')
})

test('tells the site how tall the page is, and again once it is written', async ({ demo, page }) => {
  await expect.poll(() => heightOf(page)).toBeGreaterThan(1000)
  const form = await heightOf(page)
  await demo.send({ offprompt: 'fill' })
  await demo.frame.locator('[data-submit]').click()
  await expect(demo.frame.locator('main h1')).toHaveText('Written.')
  await expect.poll(() => heightOf(page)).not.toBe(form)
  // Taller than the frame or shorter, the height is the page's own, not the frame's.
  expect(await heightOf(page)).not.toBe(1400)
})

test('says how tall the page is again when asked, for a site that listens late', async ({ demo, page }) => {
  await expect.poll(() => heightOf(page)).toBeGreaterThan(1000)
  await page.evaluate(() => {
    ;(window as unknown as { reports: unknown[] }).reports = []
  })
  await demo.send({ offprompt: 'measure' })
  await expect.poll(() => heightOf(page)).toBeGreaterThan(1000)
})

/**
 * One field at a time, filled from the start, as a website shows the registry: the site picks
 * which provider's field shows.
 */
const single = base.extend<{ fields: { frame: ReturnType<Page['frameLocator']>; send: (message: object) => Promise<void> } }>({
  fields: async ({ page }, use) => {
    const { exampleOf, providers, samplePage } = await loadShowcase()
    const rulesOf = (id: string) => providers.find(provider => provider.id === id)?.credentials[0]?.rules ?? []
    const sample = {
      asks: [
        { name: 'STRIPE_SECRET_KEY', provider: 'stripe/secret_key' },
        { name: 'RESEND_API_KEY', provider: 'resend' },
      ],
      reason: 'It sends receipts.',
      file: { kind: 'dotenv' as const, path: '.env.local', holds: [] },
      project: 'acme-api',
      asker: 'claude-code',
      revealed: true,
      view: 'fields' as const,
      demo: {
        filled: [
          ['STRIPE_SECRET_KEY', exampleOf(rulesOf('stripe'))],
          ['RESEND_API_KEY', exampleOf(rulesOf('resend'))],
        ] as const,
        single: true,
      },
    }
    await page.route(`${SITE}/`, route =>
      route.fulfill({ contentType: 'text/html', body: '<!doctype html><iframe id="fields" src="/fields" sandbox="allow-scripts" style="width:600px;height:600px"></iframe>' }),
    )
    await page.route(`${SITE}/fields`, route => route.fulfill({ contentType: 'text/html', body: samplePage(sample) }))
    await page.goto(`${SITE}/`)
    const send = (message: object) =>
      page.evaluate(sent => document.querySelector('iframe')?.contentWindow?.postMessage(sent, '*'), message)
    await use({ frame: page.frameLocator('#fields'), send })
  },
})

single('shows the first field alone, filled with a key that passes its checks', async ({ fields }) => {
  const stripe = fields.frame.locator('textarea[data-key="STRIPE_SECRET_KEY"]')
  await expect(stripe).toHaveValue(/^sk_test_EXAMPLE/)
  await expect(stripe).toBeVisible()
  await expect(fields.frame.locator('textarea[data-key="RESEND_API_KEY"]')).toBeHidden()
  await expect(fields.frame.getByText('Looks like a Stripe secret key', { exact: false })).toBeVisible()
})

single('shows the field the site picks, and it stays editable', async ({ fields }) => {
  await fields.send({ offprompt: 'show', key: 'RESEND_API_KEY' })
  const resend = fields.frame.locator('textarea[data-key="RESEND_API_KEY"]')
  await expect(resend).toBeVisible()
  await expect(fields.frame.locator('textarea[data-key="STRIPE_SECRET_KEY"]')).toBeHidden()
  await resend.fill('sk_not-a-resend-key')
  await expect(fields.frame.getByText('starts with re_', { exact: false })).toBeVisible()
})

/**
 * A page the showcase renders, left open in a tab nobody looks at for a number of minutes:
 * the browser's clock jumps a minute at a time and each timer fires at most once a jump, as a
 * browser holds back a background tab's.
 */
const shownFor = async ({ page, body, minutes }: { page: Page; body: string; minutes: number }) => {
  await page.clock.install()
  await page.route(`${SITE}/sample`, route => route.fulfill({ contentType: 'text/html', body }))
  await page.goto(`${SITE}/sample`)
  await expect(page.getByText(/left$/)).toBeVisible()
  await Array.from({ length: minutes }).reduce<Promise<void>>(
    done => done.then(() => page.clock.fastForward(60_000)),
    Promise.resolve(),
  )
}

base('keeps a sample page open however long a site shows it', async ({ page }) => {
  const { DEMO, samplePage } = await loadShowcase()
  const { demo: _, ...plain } = DEMO
  await shownFor({ page, body: samplePage(plain), minutes: 12 })

  await expect(page.getByText(/left$/)).toBeVisible()
  await expect(page.getByText('This request has expired')).toBeHidden()
})

base('keeps the page to try open however long a site shows it', async ({ page }) => {
  const { DEMO, samplePage } = await loadShowcase()
  await shownFor({ page, body: samplePage(DEMO), minutes: 12 })

  await expect(page.getByText(/left$/)).toBeVisible()
  await expect(page.getByText('This request has expired')).toBeHidden()
})
