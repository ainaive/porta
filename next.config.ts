import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'
// Relative, not '@/lib/...': this file is compiled without tsconfig aliases.
import { securityHeaders } from './src/lib/security-headers'

const withNextIntl = createNextIntlPlugin()

const nextConfig: NextConfig = {
  // Standalone output is for the container target only, so it is opt-in per
  // target rather than named after a host. Vercel's build adapter owns file
  // tracing and never writes .next/next-server.js.nft.json, which Next's
  // standalone step reads unguarded — leaving this on breaks that build.
  output: process.env.BUILD_STANDALONE === '1' ? 'standalone' : undefined,
  // Both targets serve these; the proxy cannot, since its matcher excludes
  // /api. The CSP is not here — it needs a per-request nonce (src/proxy.ts).
  headers: async () => securityHeaders(),
}

export default withNextIntl(nextConfig)
