// Applies committed SQL migrations from drizzle/. Plain JS on Node so the same
// script runs in the Docker entrypoint, on Vercel builds, and locally —
// without drizzle-kit or a TypeScript runtime in production images.
import { fileURLToPath } from 'node:url'
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'

const url = process.env.DATABASE_URL
if (!url) {
  console.error('DATABASE_URL is not set')
  process.exit(1)
}

const migrationsFolder = fileURLToPath(new URL('../drizzle', import.meta.url))
const client = postgres(url, { max: 1, onnotice: () => {} })

try {
  await migrate(drizzle(client), { migrationsFolder })
  console.log('Migrations applied')
} finally {
  await client.end()
}
