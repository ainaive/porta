// bun test preload (wired in bunfig.toml). Runs before every test file,
// including pure unit runs — so it only sets env and registers cleanup;
// database creation/migration lives in tests/db/harness.ts.
import { afterAll } from 'bun:test'
import { closeDb } from '../src/db'

function computeTestUrl(): string {
  if (process.env.TEST_DATABASE_URL) return process.env.TEST_DATABASE_URL
  const base = process.env.DATABASE_URL ?? 'postgres://localhost:5432/porta'
  const url = new URL(base)
  url.pathname = '/porta_test'
  return url.toString()
}

export const testDatabaseUrl = computeTestUrl()

const dbName = new URL(testDatabaseUrl).pathname.slice(1)
if (!/^[a-z0-9_]+$/.test(dbName) || !dbName.endsWith('_test')) {
  throw new Error(
    `Refusing to run tests against database "${dbName}" — the name must end in _test`,
  )
}

// Force-assign, never ??=: bun auto-loads .env, so the DEV database URL is
// already in process.env and a conditional assignment would point every
// test (and its TRUNCATEs) at the development database.
process.env.DATABASE_URL = testDatabaseUrl

afterAll(async () => {
  await closeDb()
})
