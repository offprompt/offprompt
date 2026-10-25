import type { NextConfig } from 'next'

const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  agentRules: false,
  // The showcase bundle carries offprompt's page, fonts and script; Node loads it as built.
  serverExternalPackages: ['offprompt'],
  // The docs' cards are drawn on request, with the fonts beside them.
  outputFileTracingIncludes: { '/og/docs': ['./src/og/fonts/*.woff'] },
  // Umami's tracker, served from the site's own origin so ad blockers leave it alone. Its events
  // go through a route handler instead (app/op/api/send), which a rewrite couldn't replace: see
  // lib/umami-proxy.ts.
  rewrites: () => Promise.resolve([{ source: '/op/script.js', destination: 'https://cloud.umami.is/script.js' }]),
}

export default config
