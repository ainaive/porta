// Loads .env so the e2e database URL can be derived from the dev one when
// E2E_DATABASE_URL isn't set (dotenv is a no-op when the file is absent).
import 'dotenv/config'
import { defineConfig, devices } from '@playwright/test'

const PORT = 3100
const BASE_URL = `http://localhost:${PORT}`

function computeE2eDatabaseUrl(): string {
  if (process.env.E2E_DATABASE_URL) return process.env.E2E_DATABASE_URL
  const base = process.env.DATABASE_URL ?? 'postgres://localhost:5432/porta'
  const url = new URL(base)
  url.pathname = '/porta_e2e'
  return url.toString()
}

export const E2E_DATABASE_URL = computeE2eDatabaseUrl()

// Bootstrap admin created by the auth.setup project (first signup = admin).
export const ADMIN = {
  name: 'E2E Admin',
  email: 'admin@e2e.test',
  password: 'porta-e2e-admin-1',
}

export default defineConfig({
  testDir: './e2e',
  // *.e2e.ts, never *.test/spec.ts — bun test would try to run those.
  testMatch: /.*\.e2e\.ts/,
  // The specs share one mutable database; serialize for determinism.
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI
    ? [['list'], ['html', { open: 'never' }]]
    : [['list']],
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/.auth/admin.json',
      },
      dependencies: ['setup'],
    },
  ],
  webServer: {
    // Production server: deterministic and no dev overlay intercepting clicks.
    // The database must already exist (e2e/prepare-db.ts runs first) because
    // the readiness URL below queries it.
    command: 'bun run start',
    url: `${BASE_URL}/en`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    env: {
      PORT: String(PORT),
      DATABASE_URL: E2E_DATABASE_URL,
      BETTER_AUTH_URL: BASE_URL,
      BETTER_AUTH_SECRET: 'e2e-only-secret-not-production',
    },
  },
})
