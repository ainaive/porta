import { describe, expect, test } from 'bun:test'
import { courseMeta, videoMeta } from './module'

describe('video meta', () => {
  test('requires provider and embedUrl', () => {
    expect(videoMeta.safeParse({}).success).toBe(false)
    expect(
      videoMeta.safeParse({
        provider: 'youtube',
        embedUrl: 'https://www.youtube.com/embed/x',
      }).success,
    ).toBe(true)
  })

  test('provider is a closed enum', () => {
    expect(
      videoMeta.safeParse({ provider: 'vimeo', embedUrl: 'https://x.test' })
        .success,
    ).toBe(false)
  })
})

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
