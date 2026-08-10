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

// The _test suffix protects the database name; this protects the server. A
// remote host whose db happens to end in _test would still be truncated
// otherwise. CI runs against a localhost service container.
const host = new URL(testDatabaseUrl).hostname
if (
  !['localhost', '127.0.0.1', '[::1]'].includes(host) &&
  process.env.ALLOW_NONLOCAL_TEST_DB !== '1'
) {
  throw new Error(
    `Refusing to run tests against non-local host "${host}" — set ALLOW_NONLOCAL_TEST_DB=1 to override`,
  )
}

// Force-assign, never ??=: bun auto-loads .env, so the DEV database URL is
// already in process.env and a conditional assignment would point every
// test (and its TRUNCATEs) at the development database.
process.env.DATABASE_URL = testDatabaseUrl

// The component-test DOM registrar (tests/happydom.ts) installs a process-wide
// window, and better-auth resolves its base URL from window.location when
// BETTER_AUTH_URL is unset — which throws on the DOM's bogus location. Give it
// a deterministic value (??= so a real one, e.g. from .env, still wins).
process.env.BETTER_AUTH_URL ??= 'http://localhost:3000'

afterAll(async () => {
  await closeDb()
})
