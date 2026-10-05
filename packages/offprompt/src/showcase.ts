/**
 * offprompt's page as a website shows it: the real page, rendered for a request described
 * here, with small scripts around the page's own. One stands in for the server, so the page
 * stays open and keeps its focus to itself; another types into a field, a key at a time, so
 * the page's own checks draw it as they would for a person. Nothing here runs in the MCP
 * server.
 */
import { homedir } from 'node:os'
import { join } from 'node:path'

import { DEFAULT_TTL_MS, type RequestedSecret, type SecretRequest } from './core/store.js'
import type { AskedSecret } from './mcp/requested.js'
import { valueFor } from './mcp/resolve.js'
import { askerFor } from './registry/clients.js'
import { renderForm } from './web/page/form.js'
import { renderWritten } from './web/page/written.js'
import type { DemoConfig } from './web/showcase/demo.js'
import { demoScript } from './web/showcase/demo-script.js'

export { clients } from './registry/clients.js'
export { formatList as formats } from './registry/formats.js'
export { categoryLabels, providers } from './registry/registry.js'
export { exampleFor, exampleOf } from './registry/examples.js'
export type { Category, Credential, Format, Logo, Provider, Rule } from './registry/schema.js'
export type { DemoMessage, DemoReport } from './web/showcase/demo.js'

/**
 * One step of what a sample types into a field: text typed out a key at a time, that many
 * random letters and digits typed out, everything deleted a key at a time, or a pause.
 */
export type Keystroke =
  | { readonly type: string }
  | { readonly random: number }
  | { readonly erase: true }
  | { readonly wait: number }

export type Typing = {
  readonly key: string
  readonly keystrokes: readonly Keystroke[]
  /** Start over once the last step is done. */
  readonly loop?: boolean
}

export type Sample = {
  readonly asks: readonly AskedSecret[]
  readonly reason: string
  /** The file the values go to, and the keys it already holds. */
  readonly file: { readonly kind: 'dotenv' | 'file'; readonly path: string; readonly holds: readonly string[] }
  /** The project's folder, under the home folder. */
  readonly project: string
  /** The agent's host, as it names itself to the MCP server, such as claude-code. */
  readonly asker: string
  /** What to type into a field once the page is up. */
  readonly typing?: Typing
  /** Every value shown in the clear, as the page's Show values switch does. */
  readonly revealed?: boolean
  /** The page after the write, with this fingerprint, in place of the form. */
  readonly written?: string
  /**
   * The whole page; the page without its top bar, requester line, paste card and footnotes,
   * so its fields come into view sooner; that and without the agent's reason too, for a small
   * picture of it; its fields alone; or, once written, its fingerprint alone.
   */
  readonly view?: 'page' | 'compact' | 'brief' | 'fields' | 'fingerprint'
  /**
   * The view in the middle of whatever height its frame has, for a picture whose frame is
   * taller than what it shows. A frame sized to the page's reported height leaves it off.
   */
  readonly centred?: boolean
  /**
   * A page to try: its write is answered with the Written page and a fingerprint of what was
   * typed, and the site around it can fill in the examples, paste the mix-up, or pick the one
   * field shown. Fields can start filled in. See `src/web/showcase/demo.ts`.
   */
  readonly demo?: Pick<DemoConfig, 'examples' | 'mixUp' | 'filled' | 'single'>
}

/**
 * The request offprompt.dev and its docs let people try: one value of each kind, in a file
 * that already holds one of them.
 */
export const DEMO: Sample = {
  project: 'acme-shop',
  asker: 'claude-code',
  asks: [
    { name: 'STRIPE_SECRET_KEY', provider: 'stripe' },
    { name: 'DATABASE_URL', format: 'postgres_url' },
    { name: 'AUTH_SECRET', generate: { bytes: 32, encoding: 'base64url' } },
  ],
  reason:
    'Checkout charges cards with **Stripe**, orders go into Postgres, and sessions are signed with a secret of their own.',
  file: { kind: 'dotenv', path: '.env.local', holds: ['DATABASE_URL'] },
  demo: {
    examples: [
      ['STRIPE_SECRET_KEY', 'sk_test_EXAMPLE0nly0f0rTheDemo0ffprompt'],
      ['DATABASE_URL', 'postgresql://shop:example@db.example.com:5432/orders'],
    ],
    mixUp: { key: 'STRIPE_SECRET_KEY', value: 'pk_test_EXAMPLE0nly0f0rTheDemo0ffprompt' },
  },
}

const NONCE = 'showcase'

const HOST = '127.0.0.1:4123'

/** JSON a script can hold: no `</script>` can close it early. */
const inScript = (value: unknown) => JSON.stringify(value).replaceAll('<', '\\u003c')

const script = (body: string) => `<script nonce="${NONCE}">(() => {\n${body}\n})();</script>`

const style = (body: string) => `<style nonce="${NONCE}">\n${body}\n</style>`

/**
 * Answers the page's status checks as an open request whose clock keeps running, and keeps
 * focus from leaving the page it is shown in. The clock starts over two minutes before it
 * would run out: one that ran low would have the page count it down between two checks and
 * close the request, as every page on the site did after a few minutes in a background tab,
 * where a browser checks only once a minute.
 */
const STANDIN = script(`const opened = Date.now();
const ttl = ${String(DEFAULT_TTL_MS / 1000)};
window.fetch = () => Promise.resolve(new Response(JSON.stringify({ status: 'awaiting', expiresIn: ttl - (((Date.now() - opened) / 1000) % (ttl - 120)) }), { headers: { 'content-type': 'application/json' } }));
HTMLElement.prototype.focus = () => {};`)

/**
 * Flips the page's own Show values switch, which unmasks every field at once, and tells the
 * page so, as a click would; a field's eye then hides that field alone.
 */
const REVEAL = script(`const toggle = document.getElementById('reveal-all');
if (toggle !== null) { toggle.checked = true; toggle.dispatchEvent(new Event('change', { bubbles: true })); }`)

/**
 * Types into a field the way a person does, one input event per key, so the page's checks
 * run on every keystroke. With reduced motion each step lands at once and the plan runs
 * once; the pauses stay, so each state can still be read.
 */
const typist = (typing: Typing) =>
  script(`const plan = ${inScript(typing)};
const field = document.querySelector('textarea[data-key="' + plan.key + '"]');
if (field === null) return;
const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const sleep = ms => new Promise(done => setTimeout(done, ms));
const put = value => { field.value = value; field.dispatchEvent(new Event('input', { bubbles: true })); };
const random = count => Array.from(crypto.getRandomValues(new Uint8Array(count)), byte => letters[byte % letters.length]).join('');
const typeOut = (text, each) => still
  ? Promise.resolve(put(field.value + text))
  : [...text].reduce((done, char) => done.then(() => { put(field.value + char); return sleep(each); }), Promise.resolve());
const eraseAll = () => {
  if (still) return Promise.resolve(put(''));
  if (field.value === '') return Promise.resolve();
  put(field.value.slice(0, -1));
  return sleep(18).then(eraseAll);
};
const play = step => 'type' in step ? typeOut(step.type, 70)
  : 'random' in step ? typeOut(random(step.random), 26)
  : 'erase' in step ? eraseAll()
  : sleep(step.wait);
const run = () => plan.keystrokes
  .reduce((done, step) => done.then(() => play(step)), Promise.resolve())
  .then(() => { if (plan.loop === true && !still) run(); });
run();`)

/** Reveals what the page script would, on the written page, which carries no script of its own. */
const WRITTEN_SCRIPT = script(
  `document.querySelectorAll('[data-needs-script]').forEach(element => element.removeAttribute('hidden'));`,
)

/** A picture of part of the page floats on whatever the page is shown over. */
const FLOATING = `body { min-height: 0; background: transparent; }
main { width: auto; margin: 0; padding: 20px 24px 48px; }`

const LIFTED = 'box-shadow: 0 12px 32px #12332A1A, 0 1px 3px #12332A0F;'

const VIEWS = {
  page: '',
  compact: style(`body > header, .requester, section.import, .fill-status, .values-head, .actions .progress, .facts { display: none !important; }
main { padding-top: 24px; gap: 18px; }`),
  brief: style(`body > header, .requester, .claim, section.import, .fill-status, .values-head, .actions .progress, .facts { display: none !important; }
main { padding-top: 22px; gap: 16px; }`),
  fields: style(`body > header, main > :not(form), form > :not(.values), .values-head { display: none !important; }
${FLOATING}
.values { ${LIFTED} }`),
  fingerprint: style(`body > header, main > :not(.fingerprint) { display: none !important; }
${FLOATING}
.fingerprint { ${LIFTED} }`),
} as const

/**
 * The view in the middle of the frame, with as much room above as below. Taller than the frame,
 * it starts at the top, as the page does.
 */
const CENTRED = style(`html, body { height: 100%; }
body { display: flex; flex-direction: column; justify-content: safe center; }
main { padding-top: 34px; padding-bottom: 34px; }`)

/** A page that shows one field at a time hides the others, as the demo's stand-in marks them. */
const SINGLE = style('.values .field[data-off] { display: none !important; }')

const secretsFor = (sample: Sample) =>
  sample.asks.map((ask): RequestedSecret => {
    const value = valueFor(ask)
    if (!value.ok) throw new Error(value.message)
    return {
      name: ask.name,
      value: value.value,
      overwrites: sample.file.holds.includes(ask.name),
      ...(ask.caption === undefined ? {} : { caption: ask.caption }),
    }
  })

const requestFor = (sample: Sample): SecretRequest => {
  // No environment, so the build machine's own cannot add where the agent runs.
  const asker = askerFor({ clientInfo: { name: sample.asker }, env: {} })
  const secrets = secretsFor(sample)
  return {
    id: 'showcase',
    secrets,
    reason: sample.reason,
    sink: {
      kind: sample.file.kind,
      absolutePath: join(homedir(), sample.project, sample.file.path),
      relativePath: sample.file.path,
      tracked: false,
      ignored: true,
      exists: sample.file.holds.length > 0,
    },
    token: 'showcase',
    nonce: NONCE,
    expiresAt: Date.now() + DEFAULT_TTL_MS,
    status: sample.written === undefined ? 'awaiting' : 'written',
    remote: false,
    ...(sample.written === undefined
      ? {}
      : { emoji: sample.written, fingerprinted: secrets.map(secret => secret.name) }),
    ...(asker === undefined ? {} : { asker }),
  }
}

/** Any four, for the Written page a demo answers its write with; the write puts its own in. */
const UNTIL_WRITTEN = '🍋 🥝 🌮 🧀'

/**
 * The stand-in for a page to try, with the Written page it answers a write with. The page
 * takes only its title, top bar and body from that, so its stylesheet, and the fonts in it,
 * stay out of this copy.
 */
const demoStandIn = ({ sample, demo }: { sample: Sample; demo: NonNullable<Sample['demo']> }) => {
  const written = renderWritten({
    request: requestFor({ ...sample, written: UNTIL_WRITTEN }),
    cspNonce: NONCE,
    host: HOST,
  }).replace(/<style nonce="[^"]*">[\s\S]*?<\/style>/, '')
  const config: DemoConfig = { ...demo, written, ttl: DEFAULT_TTL_MS / 1000 }
  return script(`${demoScript}\noffpromptDemo.start(${inScript(config)});`)
}

/** The form, with the stand-in before its script, and the reveal and the typing after it. */
const formPage = (sample: Sample) => {
  const html = renderForm({ request: requestFor(sample), cspNonce: NONCE, host: HOST })
  const opening = `<script nonce="${NONCE}">`
  const at = html.lastIndexOf(opening)
  if (at === -1) throw new Error('the page has no script to run beside')
  const end = html.indexOf('</script>', at) + '</script>'.length
  const standIn = sample.demo === undefined ? STANDIN : demoStandIn({ sample, demo: sample.demo })
  const after = `${sample.revealed === true ? REVEAL : ''}${sample.typing === undefined ? '' : typist(sample.typing)}`
  return `${html.slice(0, at)}${standIn}${html.slice(at, end)}${after}${html.slice(end)}`
}

const writtenPage = (sample: Sample) =>
  renderWritten({ request: requestFor(sample), cspNonce: NONCE, host: HOST }).replace(
    '</body>',
    `${WRITTEN_SCRIPT}</body>`,
  )

/** The page offprompt serves for this sample, as a whole HTML document. */
export const samplePage = (sample: Sample) => {
  const view = sample.view ?? 'page'
  if (view === 'fingerprint' && sample.written === undefined) throw new Error('only a written page has a fingerprint')
  if ((view === 'fields' || view === 'compact' || view === 'brief') && sample.written !== undefined) {
    throw new Error('a written page has no fields')
  }
  const html = sample.written === undefined ? formPage(sample) : writtenPage(sample)
  const single = sample.demo?.single === true ? SINGLE : ''
  const centred = sample.centred === true ? CENTRED : ''
  return html.replace('</head>', `${VIEWS[view]}${single}${centred}</head>`)
}
