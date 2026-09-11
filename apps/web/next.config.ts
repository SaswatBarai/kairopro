import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { config } from 'dotenv'
import type { NextConfig } from 'next'

// Single root .env, loaded before the config is evaluated so that
// NEXT_PUBLIC_* values are inlined at build time.
const here = path.dirname(fileURLToPath(import.meta.url))
config({ path: path.resolve(here, '../../.env') })

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Workspace packages ship raw TypeScript and are compiled by Next.js.
  // No transpilePackages entry is needed — resolution goes through each
  // package's `exports` map.
  experimental: {
    optimizePackageImports: ['@kairopro/contracts'],
  },
}

export default nextConfig
