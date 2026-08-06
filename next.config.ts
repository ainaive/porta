import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin()

const nextConfig: NextConfig = {
  // Required for the Docker deployment target; Vercel ignores it.
  output: 'standalone',
}

export default withNextIntl(nextConfig)
