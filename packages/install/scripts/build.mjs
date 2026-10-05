import { build } from 'esbuild'
import { resolve } from 'node:path'
import { writeNotices } from 'offprompt/notices'

const root = resolve(import.meta.dirname, '..')

/**
 * The installer as one file that needs nothing beside it but `node`, so the npm package that
 * carries it declares no dependencies and runs wherever it is unpacked. Its dependencies come
 * in as ES modules where they ship one, since jsonc-parser's CommonJS build loads its parts in
 * a way a bundle cannot follow. The CommonJS left, cross-spawn's, loads Node's own modules
 * through the `require` the banner makes.
 */
const { metafile } = await build({
  absWorkingDir: root,
  entryPoints: [{ in: 'src/cli.ts', out: 'offprompt-install' }],
  outdir: 'dist',
  outExtension: { '.js': '.mjs' },
  bundle: true,
  mainFields: ['module', 'main'],
  platform: 'node',
  target: 'node20',
  format: 'esm',
  legalComments: 'none',
  banner: {
    js: [
      '#!/usr/bin/env node',
      "import { createRequire as requireFrom } from 'node:module'",
      'const require = requireFrom(import.meta.url)',
    ].join('\n'),
  },
  logLevel: 'warning',
  metafile: true,
})

/** The packages it carries inside have their licences written into the notices that ship beside it. */
await writeNotices('offprompt-install.mjs', [metafile], root)
