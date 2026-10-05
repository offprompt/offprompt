#!/usr/bin/env node
// Stands in for cloudflared. FAKE_CLOUDFLARED picks what it does: announce (the default),
// silent (never prints an address), exit (announces, then ends), stubborn (ignores SIGTERM).
import { appendFileSync } from 'node:fs'

const mode = process.env.FAKE_CLOUDFLARED ?? 'announce'
const log = process.env.FAKE_CLOUDFLARED_LOG

if (log !== undefined) appendFileSync(log, `${JSON.stringify({ pid: process.pid, args: process.argv.slice(2) })}\n`)

process.stdout.write('this line must never reach the protocol channel\n')
process.stderr.write('2026-09-21T00:00:00Z INF Requesting new quick Tunnel on trycloudflare.com...\n')

if (mode !== 'silent') {
  process.stderr.write(`2026-09-21T00:00:00Z INF |  https://fake-${String(process.pid)}.trycloudflare.com  |\n`)
}

if (mode === 'stubborn') process.on('SIGTERM', () => undefined)

if (mode === 'exit') setTimeout(() => process.exit(0), 50)
else setInterval(() => undefined, 1_000)
