import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

/** Only the admin password's hash is kept here. */
const ADMIN_PASSWORD_SHA256 = 'admin password hash'

const here = path => fileURLToPath(new URL(path, import.meta.url))

const sha256 = value => createHash('sha256').update(value, 'utf8').digest('hex')

if (existsSync(here('.env'))) process.loadEnvFile(here('.env'))

/** Every setting the relay needs, and how to tell a wrong one. */
const SETTINGS = [
  { name: 'ADMIN_PASSWORD', fits: value => sha256(value) === ADMIN_PASSWORD_SHA256, wrong: 'is not the admin password' },
  { name: 'STRIPE_WEBHOOK_SECRET', fits: value => /^whsec_.{14,}$/.test(value), wrong: 'is not a Stripe webhook signing secret' },
  { name: 'VERCEL_TOKEN', fits: value => /^[A-Za-z0-9]{24}$/.test(value), wrong: 'is not a Vercel access token' },
  { name: 'DATABASE_URL', fits: value => /^postgres(?:ql)?:\/\/[^/\s]+/.test(value), wrong: 'is not a Postgres URL' },
  { name: 'JWT_SECRET', fits: value => /^[0-9a-f]{64,}$/i.test(value), wrong: 'is not 32 bytes of hex' },
  { name: 'ACME_PARTNER_KEY', fits: value => value !== '', wrong: 'is empty' },
  {
    name: 'GITHUB_APP_PRIVATE_KEY',
    fits: value => /-----BEGIN [A-Z ]+-----/.test(value) && /-----END [A-Z ]+-----/.test(value),
    wrong: 'is not a PEM private key',
  },
]

const problemWith = ({ name, fits, wrong }) => {
  const value = process.env[name] ?? ''
  if (value === '') return `${name} is not set`
  return fits(value) ? undefined : `${name} ${wrong}`
}

const problems = SETTINGS.map(problemWith).filter(problem => problem !== undefined)
if (problems.length === 0) {
  console.log('Configuration complete. The relay is ready.')
} else {
  console.error(`The relay cannot start:\n${problems.map(problem => `  ${problem}`).join('\n')}`)
  process.exitCode = 1
}
