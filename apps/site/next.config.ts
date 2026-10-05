import type { NextConfig } from 'next'

const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  agentRules: false,
  // The showcase bundle carries offprompt's page, fonts and script; Node loads it as built.
  serverExternalPackages: ['offprompt'],
  // The docs' cards are drawn on request, with the fonts beside them.
  outputFileTracingIncludes: { '/og/docs': ['./src/og/fonts/*.woff'] },
}

export default config
