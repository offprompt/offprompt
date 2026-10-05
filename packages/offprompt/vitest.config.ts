import { defineConfig } from 'vitest/config'

import { clientDefines } from './scripts/build.mjs'

export default defineConfig({
  // The server under test embeds the same page script the shipped bundle does.
  define: clientDefines(),
  test: {
    include: ['tests/**/*.test.ts', 'src/registry/**/*.test.ts'],
    environment: 'node',
    restoreMocks: true,
  },
})
