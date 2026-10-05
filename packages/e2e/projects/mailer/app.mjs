import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const env = fileURLToPath(new URL('.env', import.meta.url))
if (existsSync(env)) process.loadEnvFile(env)

const key = process.env.RESEND_API_KEY ?? ''
if (/^re_\w{20,}$/.test(key)) {
  console.log('The mailer is ready.')
} else {
  console.error(key === '' ? 'The mailer cannot start: RESEND_API_KEY is not set' : 'RESEND_API_KEY is not a Resend API key')
  process.exitCode = 1
}
