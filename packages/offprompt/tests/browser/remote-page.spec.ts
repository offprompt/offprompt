import { expect, test as base } from '@playwright/test'

import { fontFaces, pasteScript } from '../../scripts/build.mjs'
import { setupWorkspace } from '../helpers/workspace.js'

const RESEND_KEY = `re_${'a'.repeat(30)}`

const FROM_ADDRESS = 'hello@example.com'

/**
 * The server embeds the page script and fonts through build-time defines. Here nothing is
 * bundled, so both are built and put where the defines would have put them, before the
 * server loads.
 */
const loadServer = async () => {
  Object.assign(globalThis, { OFFPROMPT_PASTE_SCRIPT: pasteScript(), OFFPROMPT_FONT_FACES: fontFaces() })
  const [{ startLoopbackServer }, { createRequestStore }, { newSealPair }, { resolveSink }, { requestedSecrets }] =
    await Promise.all([
      import('../../src/web/server.js'),
      import('../../src/core/store.js'),
      import('../../src/core/sealing.js'),
      import('../../src/core/sinks.js'),
      import('../../src/mcp/requested.js'),
    ])
  return { startLoopbackServer, createRequestStore, newSealPair, resolveSink, requestedSecrets }
}

/** A remote request on a real loopback server, and the link a sandbox would hand out for it. */
const test = base.extend<{
  remote: {
    link: string
    pageUrl: string
    read: (relative: string) => Promise<string>
    /** What happens when whoever else holds the link answers it first. */
    answerElsewhere: () => Promise<void>
    /** The fingerprint the server took from the file, as the agent is given it. */
    emoji: () => string | undefined
  }
}>({
  remote: async ({ browserName }, use) => {
    void browserName
    const { startLoopbackServer, createRequestStore, newSealPair, resolveSink, requestedSecrets } = await loadServer()
    const workspace = await setupWorkspace()
    const store = createRequestStore()
    const server = await startLoopbackServer({ store })
    const sink = await resolveSink({ root: workspace.root, spec: { kind: 'dotenv', path: '.env' } })
    if (!sink.ok) throw new Error(sink.message)
    const secrets = await requestedSecrets({
      sink: sink.value,
      asks: [
        { name: 'RESEND_API_KEY', provider: 'resend' },
        { name: 'RESEND_FROM_ADDRESS', format: 'email' },
      ],
    })
    if (!secrets.ok) throw new Error(secrets.message)
    const pair = await newSealPair()
    const request = store.create({ secrets: secrets.value, reason: 'needed', sink: sink.value, sealKey: pair.sealKey })
    const pageUrl = server.urlFor(request)

    const answerElsewhere = () => {
      store.markWritten(request.id)
      return Promise.resolve()
    }
    await use({
      link: `${pageUrl}#k=${pair.publicKey}`,
      pageUrl,
      read: workspace.read,
      answerElsewhere,
      emoji: () => store.get(request.id)?.emoji,
    })

    await server.close()
    await workspace.cleanup()
  },
})

test('a remote page on a loopback address fills, seals and writes', async ({ page, remote }) => {
  const posted: string[] = []
  page.on('request', request => {
    if (request.method() === 'POST') posted.push(request.postData() ?? '')
  })

  await page.goto(remote.link)
  await expect(page.getByText('Values are encrypted in this browser.')).toBeVisible()
  await expect(page.locator('[data-submit]')).toBeDisabled()

  await page.locator('#value0').fill(RESEND_KEY)
  await page.locator('#value1').fill(FROM_ADDRESS)
  await page.locator('[data-submit]').click()

  await expect(page.getByRole('heading', { name: 'Written.' })).toBeVisible()
  expect(await remote.read('.env')).toBe(`RESEND_API_KEY=${RESEND_KEY}\nRESEND_FROM_ADDRESS=${FROM_ADDRESS}\n`)

  const [body] = posted
  expect(posted).toHaveLength(1)
  expect([...new URLSearchParams(body).keys()].sort()).toEqual(['nonce', 'sealed'])
  expect(body).not.toContain(RESEND_KEY)
  expect(body).not.toContain(FROM_ADDRESS)
  expect(decodeURIComponent(body ?? '')).not.toContain(FROM_ADDRESS)
})

test('a pasted .env block fills the fields and still leaves sealed', async ({ page, remote, browserName }) => {
  test.skip(browserName !== 'chromium', 'synthetic paste events carry clipboard data in Chromium only')
  const posted: string[] = []
  page.on('request', request => {
    if (request.method() === 'POST') posted.push(request.postData() ?? '')
  })

  await page.goto(remote.link)
  await page.locator('#value0').focus()
  await page.evaluate(
    text => {
      const data = new DataTransfer()
      data.setData('text/plain', text)
      const paste = new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true })
      document.activeElement?.dispatchEvent(paste)
    },
    `RESEND_API_KEY=${RESEND_KEY}\nRESEND_FROM_ADDRESS=${FROM_ADDRESS}\n`,
  )
  await page.locator('[data-submit]').click()

  await expect(page.getByRole('heading', { name: 'Written.' })).toBeVisible()
  expect(posted.join('')).not.toContain(RESEND_KEY)
  expect(await remote.read('.env')).toContain(`RESEND_API_KEY=${RESEND_KEY}`)
})

test('a link with no key keeps Write it off and says why', async ({ page, remote }) => {
  await page.goto(remote.pageUrl)
  await page.locator('#value0').fill(RESEND_KEY)
  await page.locator('#value1').fill(FROM_ADDRESS)

  await expect(page.locator('[data-submit]')).toBeDisabled()
  await expect(page.locator('#seal-status')).toHaveText('This link is missing its key. Ask the agent for the link again.')
})

test('a link with a broken key keeps Write it off and says why', async ({ page, remote }) => {
  await page.goto(`${remote.pageUrl}#k=not-a-key`)
  await page.locator('#value0').fill(RESEND_KEY)
  await page.locator('#value1').fill(FROM_ADDRESS)

  await expect(page.locator('[data-submit]')).toBeDisabled()
  await expect(page.locator('#seal-status')).toHaveText('This link is missing its key. Ask the agent for the link again.')
})

test('the page works under localhost, the other name for the loopback', async ({ page, remote }) => {
  await page.goto(remote.link.replace('127.0.0.1', 'localhost'))
  await page.locator('#value0').fill(RESEND_KEY)
  await page.locator('#value1').fill(FROM_ADDRESS)
  await page.locator('[data-submit]').click()

  await expect(page.getByRole('heading', { name: 'Written.' })).toBeVisible()
})

test('the page says it is connected, and that the request was answered elsewhere', async ({ page, remote }) => {
  await page.goto(remote.link)
  const line = page.locator('#connection')
  await expect(line).toHaveText(/^Connected to the agent · \d+:\d\d left$/)

  // Someone else answers the link first: the page says so before the human types.
  await remote.answerElsewhere()
  await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 11_000)))
  await expect(line).toHaveText('Answered elsewhere')
  await expect(page.locator('#page-notice')).toContainText('This request has already been answered')
  await page.locator('#value0').fill(RESEND_KEY)
  await page.locator('#value1').fill(FROM_ADDRESS)
  await expect(page.locator('[data-submit]')).toBeDisabled()
})

test('the page takes its own fingerprint, and it matches the one taken from the file', async ({ page, remote }) => {
  await page.goto(remote.link)
  await page.locator('#value0').fill(RESEND_KEY)
  await page.locator('#value1').fill(FROM_ADDRESS)
  await page.locator('[data-submit]').click()

  await expect(page.getByRole('heading', { name: 'Written.' })).toBeVisible()
  await expect(page.locator('ul.emoji')).toHaveAttribute('aria-label', remote.emoji() ?? 'missing')
  await expect(page.locator('[data-mismatch]')).toBeHidden()
})

test('a write answered by something other than offprompt leaves the values in place to try again', async ({ page, remote }) => {
  await page.route('**/r/*', route =>
    route.request().method() === 'POST' ? route.fulfill({ status: 502, body: 'Bad Gateway' }) : route.continue(),
  )
  await page.goto(remote.link)
  await page.locator('#value0').fill(RESEND_KEY)
  await page.locator('#value1').fill(FROM_ADDRESS)
  await page.locator('[data-submit]').click()

  await expect(page.locator('#fill-status')).toContainText('Something other than offprompt answered (HTTP 502)')
  await expect(page.locator('[data-submit]')).toBeEnabled()
  await expect(page.locator('#value0')).toHaveValue(RESEND_KEY)
  await expect(page.locator('#value0')).toBeEditable()
})

test('a write that lands but whose answer is lost is taken for this page’s own', async ({ page, remote }) => {
  await page.route('**/r/*', async route => {
    if (route.request().method() !== 'POST') return route.continue()
    await route.fetch()
    return route.abort()
  })
  await page.goto(remote.link)
  await page.locator('#value0').fill(RESEND_KEY)
  await page.locator('#value1').fill(FROM_ADDRESS)
  await page.locator('[data-submit]').click()

  await expect(page.locator('#page-notice')).toContainText('Your values were written')
  await expect(page.locator('#connection')).toHaveText('Written')
  expect(await remote.read('.env')).toContain(`RESEND_API_KEY=${RESEND_KEY}`)
})
