// Rate limiting is disabled outside production, which is right for the app
// and would leave the rules untested. So this drives the exact exported
// config through a second better-auth instance with `enabled` forced on,
// against the same test database and the same rate_limit table. What is under
// test is this project's numbers, storage choice and IP keying — not
// better-auth's limiter, which is taken as given.
import { beforeEach, describe, expect, test } from 'bun:test'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { db } from '@/db'
import { rateLimit } from '@/db/schema/auth'
import { rateLimitConfig, trustedIpHeaders } from '@/lib/auth'
import { resetDb } from './harness'

const limited = betterAuth({
  database: drizzleAdapter(db, { provider: 'pg' }),
  baseURL: 'http://localhost:3000',
  emailAndPassword: { enabled: true },
  advanced: { ipAddress: { ipAddressHeaders: ['x-forwarded-for'] } },
  rateLimit: { ...rateLimitConfig, enabled: true },
})

function signIn(ip: string): Promise<Response> {
  return limited.handler(
    new Request('http://localhost:3000/api/auth/sign-in/email', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-forwarded-for': ip,
      },
      body: JSON.stringify({
        email: 'nobody@example.test',
        password: 'wrong-password-1',
      }),
    }),
  )
}

async function statusesFor(ip: string, attempts: number): Promise<number[]> {
  const statuses: number[] = []
  for (let i = 0; i < attempts; i++) statuses.push((await signIn(ip)).status)
  return statuses
}

beforeEach(async () => {
  await resetDb()
})

describe('credential rate limiting', () => {
  test('cuts off sign-in attempts past the configured max', async () => {
    const statuses = await statusesFor('203.0.113.10', 7)
    const { max } = rateLimitConfig.customRules['/sign-in/email']

    // Wrong password, so the allowed ones fail 401 — what matters is that
    // they were answered at all.
    expect(statuses.slice(0, max).every((status) => status !== 429)).toBe(true)
    expect(statuses.slice(max).every((status) => status === 429)).toBe(true)
  })

  // The whole point of storage: 'database'. In memory this row would not
  // exist, and a recycled instance would hand the attacker a fresh budget.
  test('keeps its counter in Postgres, not in the process', async () => {
    await statusesFor('203.0.113.11', 3)
    const rows = await db.select().from(rateLimit)
    expect(rows.length).toBeGreaterThan(0)
    expect(rows.some((row) => row.key.includes('203.0.113.11'))).toBe(true)
    expect(rows.some((row) => row.count > 0)).toBe(true)
  })

  // A limiter that pooled every client into one bucket would let one attacker
  // lock everybody else out — a denial-of-service lever rather than a defence.
  test('buckets per address, so one attacker cannot lock everyone out', async () => {
    const { max } = rateLimitConfig.customRules['/sign-in/email']
    const attacker = await statusesFor('203.0.113.12', max + 2)
    expect(attacker.at(-1)).toBe(429)

    // A different address, arriving after the first is already blocked.
    expect((await signIn('203.0.113.13')).status).not.toBe(429)
  })
})

describe('rate limit rules', () => {
  test('cover every endpoint that takes a credential or sends mail', () => {
    expect(Object.keys(rateLimitConfig.customRules).sort()).toEqual([
      '/request-password-reset',
      '/reset-password',
      '/sign-in/email',
      '/sign-up/email',
    ])
  })

  // better-auth's own defaults are 3 per 10s on sign-in — six resets a
  // minute. A rule that is not stricter over a minute is not worth writing.
  test('are stricter over a minute than the defaults they replace', () => {
    for (const rule of Object.values(rateLimitConfig.customRules)) {
      expect(rule.window).toBe(60)
      expect(rule.max).toBeLessThanOrEqual(5)
    }
  })

  test('shares Postgres rather than per-instance memory', () => {
    expect(rateLimitConfig.storage).toBe('database')
  })
})

describe('trustedIpHeaders', () => {
  const env = process.env

  function withEnv(
    vars: Record<string, string | undefined>,
  ): string[] | undefined {
    process.env = {
      ...env,
      VERCEL: undefined,
      TRUST_PROXY_HEADERS: undefined,
      ...vars,
    }
    try {
      return trustedIpHeaders()
    } finally {
      process.env = env
    }
  }

  // `[]`, not undefined: better-auth's default IS ['x-forwarded-for'], so
  // undefined would leave the header trusted and this whole function a no-op.
  test('trusts no forwarded header when nothing in front overwrites it', () => {
    expect(withEnv({})).toEqual([])
  })

  test('defers to the default where the platform overwrites the header', () => {
    expect(withEnv({ VERCEL: '1' })).toBeUndefined()
    expect(withEnv({ TRUST_PROXY_HEADERS: '1' })).toBeUndefined()
  })
})

// The failure this guards: an attacker who sets x-forwarded-for themselves
// gets a fresh bucket per request and the limit never bites.
describe('a forged forwarded header', () => {
  const exposed = betterAuth({
    database: drizzleAdapter(db, { provider: 'pg' }),
    baseURL: 'http://localhost:3000',
    emailAndPassword: { enabled: true },
    advanced: { ipAddress: { ipAddressHeaders: [] } },
    rateLimit: { ...rateLimitConfig, enabled: true },
  })

  test('buys no extra budget when no proxy is trusted', async () => {
    const { max } = rateLimitConfig.customRules['/sign-in/email']
    const attempt = (ip: string) =>
      exposed.handler(
        new Request('http://localhost:3000/api/auth/sign-in/email', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-forwarded-for': ip,
          },
          body: JSON.stringify({
            email: 'nobody@example.test',
            password: 'wrong-password-1',
          }),
        }),
      )

    // A different forged address every time. If the header were trusted this
    // would never be throttled at all.
    const statuses: number[] = []
    for (let i = 0; i < max + 2; i++) {
      statuses.push((await attempt(`198.51.100.${i + 1}`)).status)
    }
    expect(statuses.at(-1)).toBe(429)
  })
})
