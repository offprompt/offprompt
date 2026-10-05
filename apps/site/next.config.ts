import type { NextConfig } from 'next'

const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  agentRules: false,
  // The showcase bundle carries offprompt's page, fonts and script; Node loads it as built.
  serverExternalPackages: ['offprompt'],
}

export default config
