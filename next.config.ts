import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin()

const nextConfig: NextConfig = {
  // Standalone output is for the container target only, so it is opt-in per
  // target rather than named after a host. Vercel's build adapter owns file
  // tracing and never writes .next/next-server.js.nft.json, which Next's
  // standalone step reads unguarded — leaving this on breaks that build.
  output: process.env.BUILD_STANDALONE === '1' ? 'standalone' : undefined,
}

export default withNextIntl(nextConfig)
