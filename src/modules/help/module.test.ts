import { describe, expect, test } from 'bun:test'
import { courseMeta, help, VIDEO_PROVIDER_ORIGINS, videoMeta } from './module'

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

  test('accepts every origin its provider declares', () => {
    for (const [provider, origins] of Object.entries(VIDEO_PROVIDER_ORIGINS)) {
      for (const origin of origins) {
        expect(
          videoMeta.safeParse({ provider, embedUrl: `${origin}/embed/x` })
            .success,
        ).toBe(true)
      }
    }
  })

  // The refinement exists because `provider` was a promise the schema did not
  // keep: any URL an admin pasted went into an iframe, whatever the select
  // said.
  test('rejects a URL the declared provider does not host', () => {
    const parsed = videoMeta.safeParse({
      provider: 'youtube',
      embedUrl: 'https://player.bilibili.com/player.html?bvid=x',
    })
    expect(parsed.success).toBe(false)
    expect(parsed.error?.issues[0]?.path).toEqual(['embedUrl'])
    expect(parsed.error?.issues[0]?.message).toContain('youtube')
  })

  test('rejects a lookalike host', () => {
    for (const embedUrl of [
      'https://www.youtube.com.evil.test/embed/x',
      'https://evil.test/www.youtube.com/embed/x',
      'http://www.youtube.com/embed/x', // scheme is part of the origin
    ]) {
      expect(
        videoMeta.safeParse({ provider: 'youtube', embedUrl }).success,
      ).toBe(false)
    }
  })
})

// The CSP's frame-src is derived from the manifest. If these two ever part
// company, a save the schema accepts renders as a blank player.
describe('declared frame sources', () => {
  test('cover exactly the origins the schema accepts', () => {
    expect([...(help.frameSrc ?? [])].sort()).toEqual(
      Object.values(VIDEO_PROVIDER_ORIGINS).flat().sort(),
    )
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
