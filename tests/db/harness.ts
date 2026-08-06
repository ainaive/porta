// Imported by every tests/db suite: ensures porta_test exists, applies the
// committed migrations once per test process, and exposes resetDb() for
// per-test isolation. The preload (tests/preload.ts) has already pointed
// DATABASE_URL at the test database and guarded the _test suffix.
import { fileURLToPath } from 'node:url'
import { sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'
import { db } from '@/db'
import { testDatabaseUrl } from '../preload'

const dbName = new URL(testDatabaseUrl).pathname.slice(1)

const adminUrl = new URL(testDatabaseUrl)
adminUrl.pathname = '/postgres'
const admin = postgres(adminUrl.toString(), { max: 1, onnotice: () => {} })
try {
  await admin.unsafe(`CREATE DATABASE "${dbName}"`)
} catch (error) {
  // 42P04: database already exists
  if ((error as { code?: string }).code !== '42P04') throw error
} finally {
  await admin.end({ timeout: 5 })
}

const migrator = postgres(testDatabaseUrl, { max: 1, onnotice: () => {} })
await migrate(drizzle(migrator), {
  migrationsFolder: fileURLToPath(new URL('../../drizzle', import.meta.url)),
})
await migrator.end({ timeout: 5 })

export async function resetDb(): Promise<void> {
  await db.execute(
    sql`TRUNCATE "user", "session", "account", "verification", "invites",
        "resources", "resource_translations", "course_chapters",
        "course_chapter_translations" CASCADE`,
  )
}
