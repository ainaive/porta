import { describe, expect, test } from 'bun:test'
import { eventMeta } from './module'

describe('event meta', () => {
  // A calendar day, not an instant: these happen in a room, on one office's
  // day. Accepting a timestamp would invite a timezone conversion nobody
  // asked for, and the listing sorts on this string.
  test('date is an ISO calendar day', () => {
    expect(eventMeta.safeParse({ date: '2026-09-08' }).success).toBe(true)
    for (const date of [
      '2026-9-8',
      '08-09-2026',
      '2026-09-08T16:00:00Z',
      'next Tuesday',
    ]) {
      expect(eventMeta.safeParse({ date }).success).toBe(false)
    }
  })

  test('kind is a closed enum', () => {
    for (const kind of ['office-hours', 'workshop', 'clinic', 'review']) {
      expect(eventMeta.safeParse({ date: '2026-09-08', kind }).success).toBe(
        true,
      )
    }
    expect(
      eventMeta.safeParse({ date: '2026-09-08', kind: 'party' }).success,
    ).toBe(false)
  })

  test('registerUrl must be a URL', () => {
    const date = '2026-09-08'
    expect(
      eventMeta.safeParse({ date, registerUrl: 'https://x.test/signup' })
        .success,
    ).toBe(true)
    expect(
      eventMeta.safeParse({ date, registerUrl: 'go/signup' }).success,
    ).toBe(false)
  })

  test('date is required; the rest may still be unknown', () => {
    expect(eventMeta.safeParse({}).success).toBe(false)
    expect(eventMeta.safeParse({ date: '2026-09-08' }).success).toBe(true)
  })
})
