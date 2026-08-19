// drizzle-kit runs under Node, not Bun, so .env must be loaded explicitly.
import 'dotenv/config'
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  // Core tables plus whatever each module declares for itself — a module
  // adds a schema file and drizzle-kit picks it up (ADR 0013).
  schema: ['./src/db/schema/index.ts', './src/modules/*/schema.ts'],
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
})
