import type { Metadata } from 'next'

import { Anchor } from '@/components/anchor'
import { article, GuidePage, howTo, LINK, Part, type Step, Steps } from '@/components/guide'
import { Bright, Collect, Figure, Says, Session, Shot, Tool, Waiting, You } from '@/components/guide-shots'
import { HUB, SUPABASE } from '@/lib/guides'
import { pageMetadata } from '@/lib/metadata'

export const metadata: Metadata = pageMetadata(SUPABASE)

const SCRIPT = `
import { createClient } from '@supabase/supabase-js'

// A server-side client: no user session to keep or refresh.
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// auth.admin needs a secret key, and so only ever runs on a server.
const { data, error } = await supabase.auth.admin.listUsers()

if (error) {
  console.error(error.message)
  process.exit(1)
}

console.log(\`\${data.users.length} users\`)`

const NEXT = `
import 'server-only'

import { createClient } from '@supabase/supabase-js'

export const supabaseAdmin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
})`

const PROJECT = 'acme-admin'

/** Claude Code asking offprompt for the project URL and a secret key. */
const Asking = () => (
  <Session project={PROJECT}>
    <You>Write a script that lists the project&apos;s users.</You>
    <Says>
      Listing users goes through supabase.auth.admin, which needs a secret key, so this runs as a server script and
      never in the browser. I&apos;ll ask you for SUPABASE_URL and SUPABASE_SECRET_KEY with offprompt.
    </Says>
    <Collect>
      <span>
        file: <Bright>.env.local</Bright>
      </span>
      <span className="whitespace-pre">
        keys: <Bright>SUPABASE_URL</Bright> <span className="hidden text-term-dim lg:inline">· url</span>
      </span>
      <span className="whitespace-pre">
        {'      '}
        <Bright>SUPABASE_SECRET_KEY</Bright> <span className="hidden text-term-dim lg:inline">· supabase</span>
      </span>
      <span>Opened http://127.0.0.1:4123 in your browser. Waiting for you to write them…</span>
    </Collect>
    <Waiting />
  </Session>
)

/** What a policy error should lead to: a policy, not the key that skips them all. */
const Policy = () => (
  <Figure caption="What to ask of the agent when Row Level Security stops a query: a policy for that table, with the publishable key still in use.">
    <Session project={PROJECT}>
      <You>Saving a profile fails. Fix it.</You>
      <Says>
        The insert fails with &ldquo;new row violates row-level security policy for table profiles&rdquo;. Switching to
        the secret key would skip every policy on every table, so I&apos;ll add a policy that lets a signed-in user
        insert their own row instead.
      </Says>
      <Tool name="Write" args="supabase/migrations/20261031120000_profiles_insert_own.sql">
        <span>Wrote 4 lines to supabase/migrations/20261031120000_profiles_insert_own.sql</span>
      </Tool>
    </Session>
  </Figure>
)

/** The admin script, run by the agent with the file loaded. */
const Listed = () => (
  <Figure caption="The agent runs the script on your machine. The secret key goes from .env.local to Supabase, and never through the session.">
    <Session project={PROJECT}>
      <Tool name="Bash" args="node --env-file=.env.local list-users.mjs">
        <span>42 users</span>
      </Tool>
    </Session>
  </Figure>
)

const STEPS: readonly Step[] = [
  {
    name: 'Check that the code needs a secret key at all',
    picture: <Policy />,
    text: "Most of an app's code should use the publishable key, with Row Level Security deciding what each user may read and write. A secret key is for code that has to act beyond any one user: an admin script, a webhook handler, a scheduled job, or a call to `supabase.auth.admin`. If the agent reaches for the secret key because a query came back empty or failed with a row-level security error, the fix is a policy, not the key.",
  },
  {
    name: 'Make a secret key for this one use',
    text: 'In the Dashboard, open the project’s Settings, then API Keys, and create a new secret key named after the component that will use it, such as `admin-scripts`. Supabase suggests one secret key per backend component, so a leak means deleting one key while the others keep working. A legacy `service_role` key cannot be revoked on its own like that.',
  },
  {
    name: 'Let the agent ask for SUPABASE_SECRET_KEY',
    text: "Ask for the task: “Write a script that lists the project's users.” The agent calls offprompt's `collect_secret`, and a page opens in your browser on `127.0.0.1`. When the agent knows the project ref, the 20 letters before `.supabase.co` in the project's URL, the key's link on the page opens that project's API keys. The URL itself is not a secret, so the page shows it in the clear.",
    code: [
      {
        file: 'collect_secret',
        text: `
{
  "secrets": [
    { "name": "SUPABASE_URL", "format": "url", "secret": false },
    { "name": "SUPABASE_SECRET_KEY", "provider": "supabase", "link": { "project": "abcdefghijklmnopqrst" } }
  ],
  "reason": "The user list comes from **Supabase**'s admin API, which needs a secret key.",
  "sink": { "kind": "dotenv", "path": ".env.local" }
}`,
      },
    ],
    after:
      'The key field takes an `sb_secret_` key, or a legacy `service_role` JWT for an older project. offprompt writes both values to `.env.local`, and the agent gets their names and a four-emoji fingerprint.',
  },
  {
    name: 'Use the key only in server code',
    picture: <Listed />,
    text: 'A Node script reads both values from the environment, and runs with the file loaded:',
    code: [
      { text: 'npm install @supabase/supabase-js' },
      { file: 'list-users.mjs', text: SCRIPT },
      { text: 'node --env-file=.env.local list-users.mjs' },
    ],
  },
  {
    name: 'In Next.js, keep the client in a server-only module',
    text: "Put the admin client in a module of its own that imports `server-only`, from the npm package of that name: the build fails if a client component imports it, so the key cannot reach the browser by accident.",
    code: [{ file: 'lib/supabase-admin.ts', text: NEXT }],
    after:
      'Name the variables without `NEXT_PUBLIC_`, which would put the key in the JavaScript sent to every visitor. The URL and publishable key the browser uses go in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, as in Supabase\u2019s own examples.',
  },
]

const Supabase = () => (
  <GuidePage
    guide={SUPABASE}
    data={[article(SUPABASE), howTo(SUPABASE, STEPS)]}
    lede={
      <p>
        Supabase&apos;s <code>service_role</code> key, and the secret keys replacing it, bypass every Row Level Security
        policy: whoever holds one can read and write all the project&apos;s data. Keep it out of the agent&apos;s chat
        and out of any code the browser loads. Let the agent ask for it with offprompt, which writes it to{' '}
        <code>.env.local</code> as <code>SUPABASE_SECRET_KEY</code>, and use it only in server code.
      </p>
    }
    shot={
      <Shot
        session={<Asking />}
        sample="guide-supabase"
        height={680}
        caption="Claude Code asks offprompt for the project URL and a secret key, and offprompt's page for that request opens in your browser. The URL shows in the clear, and the key's Get it link opens that project's API keys."
      />
    }
    sources={[
      { label: 'Supabase: Understanding API keys', href: 'https://supabase.com/docs/guides/api/api-keys' },
      {
        label: 'Supabase: Migrating to the new API keys',
        href: 'https://supabase.com/docs/guides/getting-started/migrating-to-new-api-keys',
      },
      {
        label: 'Supabase: Rotating leaked API keys',
        href: 'https://supabase.com/docs/guides/security/rotate-leaked-api-keys',
      },
      { label: 'supabase-js: Auth admin', href: 'https://supabase.com/docs/reference/javascript/admin-api' },
      {
        label: 'supabase-js: listUsers',
        href: 'https://supabase.com/docs/reference/javascript/auth-admin-listusers',
      },
      { label: 'Supabase: API keys announcement and timeline', href: 'https://github.com/orgs/supabase/discussions/29260' },
    ]}
  >
    <Part title="Supabase's keys">
      <ul className="flex list-disc flex-col gap-2 pl-5">
        <li>
          <strong className="font-medium text-ink">Publishable key</strong>, <code>sb_publishable_…</code>, and its
          legacy form, the <code>anon</code> key. Safe in a web page, an app or source code: it can do only what your
          Row Level Security policies allow.
        </li>
        <li>
          <strong className="font-medium text-ink">Secret key</strong>, <code>sb_secret_…</code>, and its legacy form,
          the <code>service_role</code> key. Full access to the project&apos;s data, past every policy. For servers,
          Edge Functions and other backend code only.
        </li>
      </ul>
      <p>
        The legacy keys are long JWTs that start with <code>eyJ</code>. Supabase is retiring them by the end of 2026,
        and projects made since November 2025 don&apos;t have them. They keep working beside the new keys until you
        turn them off, so an older project can move one component at a time.
      </p>
    </Part>

    <Part title="Why service_role must never be in the chat or the browser">
      <p>
        <strong className="font-medium text-ink">In the chat</strong>, the key goes to the model provider with every
        later request, and stays in the session&apos;s transcript. Supabase&apos;s own docs list chat among the ways a
        secret key must never travel.
      </p>
      <p>
        <strong className="font-medium text-ink">In client code</strong>, it is in the JavaScript every visitor
        downloads. Anyone can read it from there and use it from their own machine, with every policy bypassed. A
        variable named <code>NEXT_PUBLIC_</code> or <code>VITE_</code> is put in the browser&apos;s bundle on purpose,
        so a secret key must never have one of those names. A new secret key refuses requests from a browser, matched
        on its user agent, but that does nothing to stop someone using a leaked key from a script.
      </p>
      <p>
        <strong className="font-medium text-ink">A legacy key is hard to take back.</strong> The legacy keys are
        signed with the project&apos;s JWT secret, so retiring a leaked <code>service_role</code> key turns off{' '}
        <code>anon</code> with it. A new secret key can be deleted on its own, at once.
      </p>
    </Part>

    <Part title="Steps">
      <Steps steps={STEPS} />
    </Part>

    <Part title="If the key has leaked">
      <p>
        Make a new secret key, have the agent ask for <code>SUPABASE_SECRET_KEY</code> again with offprompt, which
        replaces the value in <code>.env.local</code>, and delete the old key once nothing uses it. Deleting a secret
        key cannot be undone. Supabase also revokes secret keys it finds in public GitHub repositories, and tells the
        project&apos;s owner. For a leaked legacy <code>service_role</code> key, move to secret keys and turn the legacy
        keys off; Supabase&apos;s guide to rotating leaked keys has the order to do it in.
      </p>
    </Part>

    <Part title="Why not paste the key into the chat">
      <p>
        <Anchor href={HUB.path} className={LINK}>
          {HUB.title}
        </Anchor>{' '}
        explains where a key pasted into an agent&apos;s chat ends up, and how offprompt keeps the agent out of{' '}
        <code>.env.local</code> once the key is written.
      </p>
    </Part>
  </GuidePage>
)

export default Supabase
