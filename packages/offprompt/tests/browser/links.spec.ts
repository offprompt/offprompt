import { expect, test as base } from '@playwright/test'

import { fontFaces, pasteScript } from '../../scripts/build.mjs'
import { setupWorkspace } from '../helpers/workspace.js'

const REF = 'abcdefghijklmnopqrst'

const VAULT = 'https://vault.acme.internal/ui/tokens/new'

/**
 * The server embeds the page script and fonts through build-time defines. Here nothing is
 * bundled, so both are built and put where the defines would have put them, before the
 * server loads.
 */
const loadServer = async () => {
  Object.assign(globalThis, { OFFPROMPT_PASTE_SCRIPT: pasteScript(), OFFPROMPT_FONT_FACES: fontFaces() })
  const [{ startLoopbackServer }, { createRequestStore }, { resolveSink }, { requestedSecrets }] = await Promise.all([
    import('../../src/web/server.js'),
    import('../../src/core/store.js'),
    import('../../src/core/sinks.js'),
    import('../../src/mcp/requested.js'),
  ])
  return { startLoopbackServer, createRequestStore, resolveSink, requestedSecrets }
}

/** A request whose keys carry the links an agent gives: a project for a Supabase key, and an address of its own. */
const test = base.extend<{ linked: { url: string; written: () => boolean } }>({
  linked: async ({ browserName }, use) => {
    void browserName
    const { startLoopbackServer, createRequestStore, resolveSink, requestedSecrets } = await loadServer()
    const workspace = await setupWorkspace()
    const store = createRequestStore()
    const server = await startLoopbackServer({ store })
    const sink = await resolveSink({ root: workspace.root, spec: { kind: 'dotenv', path: '.env' } })
    if (!sink.ok) throw new Error(sink.message)
    const secrets = await requestedSecrets({
      sink: sink.value,
      asks: [
        { name: 'SUPABASE_SECRET_KEY', provider: 'supabase', link: { project: REF } },
        { name: 'VAULT_TOKEN', link: VAULT },
      ],
    })
    if (!secrets.ok) throw new Error(secrets.message)
    const request = store.create({ secrets: secrets.value, reason: 'needed', sink: sink.value })
    await use({ url: server.urlFor(request), written: () => store.get(request.id)?.status === 'written' })
    await server.close()
    await workspace.cleanup()
  },
})

test("a filled template is the key's own Get it", async ({ page, linked }) => {
  await page.goto(linked.url)
  await expect(page.locator('a.get')).toHaveAttribute('href', `https://supabase.com/dashboard/project/${REF}/settings/api-keys`)
})

test("the agent's link opens nothing until the human confirms its host", async ({ page, context, linked }) => {
  const opened: string[] = []
  await context.route('https://vault.acme.internal/**', route => {
    opened.push(route.request().url())
    return route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>vault</title><p>vault</p>' })
  })
  await page.goto(linked.url)

  const suggestion = page.getByRole('button', { name: /Suggested by the agent/ })
  const box = page.getByRole('dialog', { name: 'Open vault.acme.internal?' })
  await expect(suggestion).toBeVisible()
  await expect(suggestion).toContainText('vault.acme.internal')
  await expect(box).toBeHidden()

  await suggestion.click()
  await expect(box).toBeVisible()
  await expect(box).toContainText('This link was proposed by your agent and not verified by offprompt.')
  await expect(box.getByRole('button', { name: 'Cancel' })).toBeFocused()
  expect(opened).toEqual([])

  await box.getByRole('button', { name: 'Cancel' }).click()
  await expect(box).toBeHidden()

  await suggestion.click()
  await page.keyboard.press('Escape')
  await expect(box).toBeHidden()

  await suggestion.click()
  const [tab] = await Promise.all([context.waitForEvent('page'), box.getByRole('link', { name: 'Open vault.acme.internal' }).click()])
  await tab.waitForLoadState()
  expect(tab.url()).toBe(VAULT)
  expect(await tab.evaluate(() => ({ referrer: document.referrer, opener: window.opener === null }))).toEqual({
    referrer: '',
    opener: true,
  })
  await expect(box).toBeHidden()
})

test('the shortcut that writes waits until the box is closed', async ({ page, linked }) => {
  await page.goto(linked.url)
  await page.locator('#value0').fill(`sb_secret_${'a'.repeat(30)}`)
  await page.locator('#value1').fill('hvs.example-token')
  await page.getByRole('button', { name: /Suggested by the agent/ }).click()
  await page.keyboard.press('ControlOrMeta+Enter')
  await page.waitForTimeout(300)
  expect(linked.written()).toBe(false)

  await page.keyboard.press('Escape')
  await page.keyboard.press('ControlOrMeta+Enter')
  await expect(page.getByRole('heading', { name: 'Written.' })).toBeVisible()
  expect(linked.written()).toBe(true)
})
