import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

export const dynamic = 'force-static'

/** The site's third-party notices, as THIRD_PARTY_NOTICES.md holds them, served with the site. */
export const GET = async () =>
  new Response(await readFile(join(process.cwd(), 'THIRD_PARTY_NOTICES.md'), 'utf8'), {
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  })
