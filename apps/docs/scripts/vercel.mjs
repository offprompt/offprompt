/**
 * Vocs serves the docs' redirects from its middleware, and a static build has none, so a build
 * for Vercel, which writes the Build Output API's `.vercel/output`, gets them as routes there,
 * ahead of the rest, with Vocs' own status. Any other build is left as it is.
 */
import { readFile, writeFile } from 'node:fs/promises'

import redirects from '../redirects.json' with { type: 'json' }

const config = new URL('../.vercel/output/config.json', import.meta.url)

/** A path as a pattern matching it alone. */
const exactly = path => `^${path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`

const output = await readFile(config, 'utf8').then(
  text => JSON.parse(text),
  () => undefined,
)

if (output !== undefined) {
  const routes = redirects.map(({ source, destination }) => ({
    src: exactly(source),
    status: 307,
    headers: { Location: destination },
  }))
  await writeFile(config, `${JSON.stringify({ ...output, routes: [...routes, ...(output.routes ?? [])] }, null, 2)}\n`)
}
