import { describe, expect, test } from 'bun:test'
import { courseMeta, guideMeta } from './module'

describe('course meta', () => {
  test('level is a closed enum', () => {
    expect(courseMeta.safeParse({ level: 'beginner' }).success).toBe(true)
    expect(courseMeta.safeParse({ level: 'expert' }).success).toBe(false)
  })

  test('estimatedHours must be positive', () => {
    expect(courseMeta.safeParse({ estimatedHours: 3 }).success).toBe(true)
    expect(courseMeta.safeParse({ estimatedHours: 0 }).success).toBe(false)
  })
})

describe('guide meta', () => {
  test('level is a closed enum', () => {
    expect(guideMeta.safeParse({ level: 'advanced' }).success).toBe(true)
    expect(guideMeta.safeParse({ level: 'expert' }).success).toBe(false)
  })

  test('sourceUrl must be a URL', () => {
    expect(guideMeta.safeParse({ sourceUrl: 'https://x.test' }).success).toBe(
      true,
    )
    expect(guideMeta.safeParse({ sourceUrl: 'not-a-url' }).success).toBe(false)
  })
})
