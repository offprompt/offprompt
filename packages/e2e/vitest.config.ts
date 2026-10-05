import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['tests/**/*.e2e.ts'],
    // An agent takes its time, and a typed value waits for the page.
    testTimeout: 8 * 60_000,
    hookTimeout: 60_000,
    // One agent at a time, so runs do not compete for the same account.
    fileParallelism: false,
  },
})
