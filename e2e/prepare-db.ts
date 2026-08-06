// Recreates the e2e database from scratch: drop, create, migrate, seed.
// Runs BEFORE `playwright test` (see the test:e2e script) because the
// webServer readiness check hits /en, which queries the database — creating
// it inside a Playwright setup project would deadlock the readiness poll.
import { execFileSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'
import { E2E_DATABASE_URL } from '../playwright.config'

const dbName = new URL(E2E_DATABASE_URL).pathname.slice(1)
if (!/^[a-z0-9_]+$/.test(dbName) || !dbName.endsWith('_e2e')) {
  throw new Error(
    `Refusing to prepare database "${dbName}" — the name must end in _e2e`,
  )
}

const adminUrl = new URL(E2E_DATABASE_URL)
adminUrl.pathname = '/postgres'
const admin = postgres(adminUrl.toString(), { max: 1, onnotice: () => {} })
await admin.unsafe(`DROP DATABASE IF EXISTS "${dbName}" WITH (FORCE)`)
await admin.unsafe(`CREATE DATABASE "${dbName}"`)
await admin.end({ timeout: 5 })

const migrator = postgres(E2E_DATABASE_URL, { max: 1, onnotice: () => {} })
await migrate(drizzle(migrator), {
  migrationsFolder: fileURLToPath(new URL('../drizzle', import.meta.url)),
})
await migrator.end({ timeout: 5 })

// Reuse the dev seed fixtures (zh-only, en-only, draft resources) in a
// subprocess so its DATABASE_URL points at the e2e database.
execFileSync('bun', ['scripts/seed.ts'], {
  env: { ...process.env, DATABASE_URL: E2E_DATABASE_URL },
  stdio: 'inherit',
})

mkdirSync(fileURLToPath(new URL('./.auth', import.meta.url)), {
  recursive: true,
})

console.log(`Prepared ${dbName}`)
