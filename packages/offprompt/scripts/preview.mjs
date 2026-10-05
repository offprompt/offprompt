import { build as esbuild } from 'esbuild'
import { spawn } from 'node:child_process'
import { resolve } from 'node:path'

import { clientDefines } from './build.mjs'

const root = resolve(import.meta.dirname, '..')
const out = resolve(root, '.preview/preview-form.mjs')

await esbuild({
  absWorkingDir: root,
  entryPoints: ['scripts/preview-form.ts'],
  outfile: out,
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'esm',
  define: clientDefines(),
  logLevel: 'warning',
})

spawn(process.execPath, [out, ...process.argv.slice(2)], { stdio: 'inherit' })
