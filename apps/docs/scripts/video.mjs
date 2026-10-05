/**
 * Records the video the introduction shows, into public/videos/: Claude Code asks offprompt for
 * a key, offprompt's page opens, the key goes in, and the agent gets back the fingerprint the
 * page shows. The page is offprompt's own, as its showcase renders it, so the video changes when
 * the page does: run `pnpm video` again. Needs Playwright's Chromium and ffmpeg.
 */
import { chromium } from '@playwright/test'
import { Buffer } from 'node:buffer'
import { execFile } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { promisify } from 'node:util'
import { exampleFor, providers, samplePage } from 'offprompt/showcase'

const run = promisify(execFile)

const out = new URL('../public/videos/', import.meta.url)

/** The stage, in CSS pixels; frames are taken at twice that and the video is 1920 wide. */
const WIDTH = 1280
const HEIGHT = 720

const KEY = 'RESEND_API_KEY'

const resend = providers.find(provider => provider.id === 'resend')
if (resend === undefined) throw new Error('the registry has no resend')
const VALUE = exampleFor(resend.credentials[0])

const page = samplePage({
  project: 'acme-app',
  asker: 'claude-code',
  asks: [{ name: KEY, provider: 'resend' }],
  reason: 'The welcome email goes out through **Resend** when someone signs up.',
  file: { kind: 'dotenv', path: '.env', holds: ['DATABASE_URL'] },
  view: 'compact',
  demo: {},
})

const font = await readFile(
  join(
    dirname(createRequire(import.meta.url).resolve('@fontsource-variable/jetbrains-mono/package.json')),
    'files/jetbrains-mono-latin-wght-normal.woff2',
  ),
)

/** Claude Code in a terminal beside a browser window that opens on offprompt's page; the script plays the session. */
const scene = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<style>
@font-face { font-family: 'JetBrains Mono'; src: url(/mono.woff2) format('woff2'); font-weight: 100 800; }
* { box-sizing: border-box; margin: 0; }
html, body { width: ${WIDTH}px; height: ${HEIGHT}px; overflow: hidden; }
body { background: #f3f4f1; font-family: system-ui, sans-serif; position: relative; }
.term {
  position: absolute; left: 48px; top: 88px; width: 620px; height: 544px;
  background: #0c0c0c; border-radius: 14px; outline: 1px solid #262626; outline-offset: -1px;
  box-shadow: 0 24px 56px #12332a33; display: flex; flex-direction: column; overflow: hidden;
}
.bar { height: 38px; flex: none; display: flex; align-items: center; gap: 8px; padding: 0 14px; border-bottom: 1px solid #262626; }
.bar i { width: 11px; height: 11px; border-radius: 50%; background: #2e2e2e; }
.bar span { flex: 1; text-align: center; padding-right: 33px; font: 12px 'JetBrains Mono', monospace; color: #5c5c5c; }
.lines {
  flex: 1; display: flex; flex-direction: column; justify-content: flex-start; gap: 14px; padding: 20px 22px 16px;
  font: 14px/22px 'JetBrains Mono', monospace; color: #e6e6e6;
}
.line { display: flex; gap: 10px; animation: in 0.25s ease-out both; }
.line > b { font-weight: inherit; flex: none; white-space: pre; }
.line > span { min-width: 0; }
.mid { color: #8a8a8a; } .dim { color: #5c5c5c; } .claude { color: #d97757; } .mint { color: #7cf5c2; } .strong { font-weight: 600; }
.result { display: flex; padding-left: 10px; color: #8a8a8a; animation: in 0.25s ease-out both; }
.result > b { font-weight: inherit; white-space: pre; color: #5c5c5c; }
.result > div { display: flex; flex-direction: column; }
.spin::before { content: '✻'; display: inline-block; animation: spin 1.6s linear infinite; }
.input { display: flex; gap: 10px; padding: 9px 14px; border-radius: 6px; outline: 1px solid #333; outline-offset: -1px; min-height: 40px; }
.caret { display: inline-block; width: 8px; height: 18px; background: #e6e6e6; vertical-align: -3px; animation: blink 1s steps(1) infinite; }
.foot { display: flex; justify-content: space-between; font-size: 12px; color: #5c5c5c; }
.browser {
  position: absolute; right: 48px; top: 32px; width: 540px; height: 656px;
  background: #fff; border-radius: 12px; outline: 1px solid #e4e6e1; outline-offset: -1px;
  box-shadow: 0 24px 56px #12332a24, 0 2px 6px #12332a14; overflow: hidden;
  opacity: 0; transform: translateY(18px) scale(0.98); transition: opacity 0.45s ease-out, transform 0.45s ease-out;
}
.browser.open { opacity: 1; transform: none; }
.chrome { height: 40px; display: flex; align-items: center; gap: 8px; padding: 0 14px; background: #f3f4f1; border-bottom: 1px solid #e4e6e1; }
.chrome i { width: 11px; height: 11px; border-radius: 50%; background: #dcdfd9; }
.chrome span { flex: 1; margin: 0 40px 0 12px; padding: 5px 12px; border-radius: 6px; background: #fff; font-size: 12px; color: #4d6158; outline: 1px solid #e4e6e1; }
.view { position: relative; height: 616px; overflow: hidden; }
iframe { border: 0; width: 675px; height: 770px; transform: scale(0.8); transform-origin: 0 0; }
@keyframes in { from { opacity: 0; transform: translateY(6px); } }
@keyframes spin { to { transform: rotate(360deg); } }
@keyframes blink { 50% { opacity: 0; } }
</style>
</head>
<body>
<div class="term">
  <div class="bar"><i></i><i></i><i></i><span>claude — ~/acme-app</span></div>
  <div class="lines" id="lines">
    <div class="input" id="input"><span class="mid">&gt;</span><span><span id="typed"></span><span class="caret"></span></span></div>
    <div class="foot"><span>&nbsp;&nbsp;? for shortcuts</span><span>⏵⏵ accept edits on</span></div>
  </div>
</div>
<div class="browser" id="browser">
  <div class="chrome"><i></i><i></i><i></i><span>127.0.0.1:4123/r/9f3c1e7a</span></div>
  <div class="view"><iframe id="page" title="offprompt's page"></iframe></div>
</div>
<script>
const lines = document.getElementById('lines')
const input = document.getElementById('input')
const add = html => {
  const holder = document.createElement('div')
  holder.innerHTML = html
  const node = holder.firstElementChild
  lines.insertBefore(node, input)
  return node
}
window.scene = {
  type: text => { document.getElementById('typed').textContent = text },
  add,
  remove: id => document.getElementById(id)?.remove(),
  open: () => {
    document.getElementById('page').src = '/page'
    document.getElementById('browser').classList.add('open')
  },
}
</script>
</body>
</html>`

const server = createServer((request, response) => {
  const routes = {
    '/': ['text/html; charset=utf-8', scene],
    '/page': ['text/html; charset=utf-8', page],
    '/mono.woff2': ['font/woff2', font],
  }
  const [type, body] = routes[request.url ?? '/'] ?? ['text/plain', 'not found']
  response.writeHead(type === 'text/plain' ? 404 : 200, { 'content-type': type })
  response.end(body)
})
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
const address = server.address()
if (address === null || typeof address === 'string') throw new Error('the scene did not get a port')
const origin = `http://127.0.0.1:${address.port}`

const browser = await chromium.launch()
const context = await browser.newContext({ viewport: { width: WIDTH, height: HEIGHT }, deviceScaleFactor: 2 })
const stage = await context.newPage()
await stage.goto(origin)
await stage.evaluate(() => globalThis.document.fonts.ready)

const pause = ms => stage.waitForTimeout(ms)
const add = html => stage.evaluate(markup => void globalThis.scene.add(markup), html)

/** Every frame Chromium paints, with when it painted it. */
const frames = []
const cdp = await context.newCDPSession(stage)
cdp.on('Page.screencastFrame', ({ data, metadata, sessionId }) => {
  frames.push({ data, at: metadata.timestamp ?? Date.now() / 1000 })
  void cdp.send('Page.screencastFrameAck', { sessionId })
})
await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 95, everyNthFrame: 1 })

await pause(800)
const prompt = 'Send a welcome email when someone signs up.'
await [...prompt].reduce(
  (done, _, at) => done.then(() => stage.evaluate(text => globalThis.scene.type(text), prompt.slice(0, at + 1))).then(() => pause(32)),
  Promise.resolve(),
)
await pause(500)
await stage.evaluate(() => globalThis.scene.type(''))
await add(`<div class="line"><b class="mid">&gt;</b><span class="mid">${prompt}</span></div>`)
await pause(900)
await add(
  `<div class="line"><b class="claude">⏺</b><span>That needs a Resend API key, and .env doesn't have one. I'll ask you for it.</span></div>`,
)
await pause(1000)
await add(`<div><div class="line"><b class="mint">⏺</b><span><span class="strong">offprompt - collect_secret</span> <span class="mid">(MCP)</span></span></div>
  <div class="result"><b>⎿  </b><div><span>file: .env</span><span>key: <span style="color:#e6e6e6">${KEY}</span><span class="dim">  · resend</span></span><span>Opened http://127.0.0.1:4123 in your browser.</span></div></div></div>`)
await add(`<div class="line claude" id="waiting"><b class="spin"></b><span>Waiting on offprompt… <span class="dim">(esc to interrupt)</span></span></div>`)
await pause(500)
await stage.evaluate(() => globalThis.scene.open())

const frame = stage.frameLocator('#page')
const field = frame.locator('label.key', { hasText: new RegExp(`^${KEY}$`) })
await field.waitFor()
await pause(1600)
const id = await field.getAttribute('for')
const input = frame.locator(`[id="${id ?? ''}"]`)
await input.click()
await pause(400)
await input.pressSequentially(VALUE, { delay: 45 })
await pause(1100)
await frame.locator('[data-submit]').click()
await frame.getByRole('heading', { name: 'Written.' }).waitFor()
const emoji = (await frame.locator('ul.emoji').getAttribute('aria-label')) ?? ''
await pause(1300)
await stage.evaluate(() => globalThis.scene.remove('waiting'))
await add(`<div class="result"><b>⎿  </b><div><span>Wrote <span style="color:#e6e6e6">${KEY}</span> to .env</span></div></div>`)
await pause(700)
await add(`<div class="line"><b class="claude">⏺</b><span>Fingerprint ${emoji}</span></div>`)
await pause(500)
await add(
  `<div class="line"><b class="claude">⏺</b><span>${KEY} is in .env. If those four emoji match your page, the key is the one you entered.</span></div>`,
)
await pause(3200)

await cdp.send('Page.stopScreencast')
await mkdir(out, { recursive: true })
await stage.screenshot({ path: new URL('how-it-works.png', out).pathname })
await browser.close()
server.close()

// Chromium paints only when something changes, so each frame lasts until the next one.
const work = await mkdtemp(join(tmpdir(), 'offprompt-video-'))
try {
  const list = await frames.reduce(async (done, { data, at }, index) => {
    const entries = await done
    const name = join(work, `${String(index).padStart(5, '0')}.jpg`)
    await writeFile(name, Buffer.from(data, 'base64'))
    const next = frames[index + 1]?.at ?? at + 0.04
    return [...entries, `file '${name}'`, `duration ${Math.max(next - at, 0.001).toFixed(4)}`]
  }, Promise.resolve([]))
  const last = list.at(-2) ?? ''
  await writeFile(join(work, 'frames.txt'), `${[...list, last].join('\n')}\n`)
  const video = new URL('how-it-works.mp4', out).pathname
  await run('ffmpeg', [
    '-y',
    '-loglevel',
    'error',
    '-f',
    'concat',
    '-safe',
    '0',
    '-i',
    join(work, 'frames.txt'),
    '-vf',
    'fps=30,scale=1920:-2:flags=lanczos:out_range=tv,format=yuv420p',
    '-c:v',
    'libx264',
    '-crf',
    '20',
    '-preset',
    'slow',
    '-color_range',
    'tv',
    '-movflags',
    '+faststart',
    video,
  ])
  const poster = new URL('how-it-works.jpg', out).pathname
  const still = new URL('how-it-works.png', out).pathname
  await run('ffmpeg', ['-y', '-loglevel', 'error', '-i', still, '-vf', 'scale=1920:-2:flags=lanczos', '-q:v', '3', poster])
  await rm(still)
  process.stdout.write(`recorded ${frames.length} frames into ${video}\n`)
} finally {
  await rm(work, { recursive: true, force: true })
}
