import { readFile } from 'node:fs/promises'
import { expect, it } from 'vitest'

import { VERSION } from '../src/version.js'

it('reports the version package.json declares', async () => {
  const manifest: unknown = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))
  const version = manifest !== null && typeof manifest === 'object' && 'version' in manifest ? manifest.version : undefined
  expect(version).toBe(VERSION)
})
