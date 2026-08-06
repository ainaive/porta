import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

export type Database = PostgresJsDatabase<typeof schema>

let instance: Database | null = null

function getDb(): Database {
  if (!instance) {
    const url = process.env.DATABASE_URL
    if (!url) throw new Error('DATABASE_URL is not set')
    const client = postgres(url, {
      // Transaction poolers (pgbouncer, Neon pooler) break prepared statements.
      prepare: process.env.DATABASE_POOLED === '1' ? false : true,
      onnotice: () => {},
    })
    instance = drizzle(client, { schema })
  }
  return instance
}

// Lazy proxy: DATABASE_URL is read on first query, never at import time, so
// `next build` can evaluate route modules without a database configured.
export const db: Database = new Proxy({} as Database, {
  get(_target, prop) {
    const real = getDb()
    const value = Reflect.get(real as object, prop)
    return typeof value === 'function' ? value.bind(real) : value
  },
})
