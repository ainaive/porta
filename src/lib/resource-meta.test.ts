import { describe, expect, test } from 'bun:test'
import {
  metaSchemas,
  parseMeta,
  sectionForType,
  slugSchema,
  typeForSection,
  videoMeta,
} from './resource-meta'

function form(entries: Record<string, string>): FormData {
  const data = new FormData()
  for (const [key, value] of Object.entries(entries)) data.set(key, value)
  return data
}

describe('meta schemas', () => {
  test('video requires provider and embedUrl', () => {
    expect(videoMeta.safeParse({}).success).toBe(false)
    expect(
      videoMeta.safeParse({
        provider: 'youtube',
        embedUrl: 'https://www.youtube.com/embed/x',
      }).success,
    ).toBe(true)
    expect(
      videoMeta.safeParse({ provider: 'vimeo', embedUrl: 'https://x.test' })
        .success,
    ).toBe(false)
  })

  test('tool rejects non-URL fields', () => {
    expect(metaSchemas.tool.safeParse({ url: 'not-a-url' }).success).toBe(false)
    expect(metaSchemas.tool.safeParse({}).success).toBe(true)
  })

  test('course level is a closed enum', () => {
    expect(metaSchemas.course.safeParse({ level: 'beginner' }).success).toBe(
      true,
    )
    expect(metaSchemas.course.safeParse({ level: 'expert' }).success).toBe(
      false,
    )
  })
})

describe('parseMeta', () => {
  test('drops empty optional fields for tools', () => {
    const { meta, error } = parseMeta(
      'tool',
      form({ url: 'https://example.com', docsUrl: '' }),
    )
    expect(error).toBeUndefined()
    expect(meta).toEqual({ url: 'https://example.com' })
  })

  test('reports zod errors with field paths', () => {
    const { meta, error } = parseMeta('tool', form({ url: 'nope' }))
    expect(meta).toBeUndefined()
    expect(error).toContain('url')
  })

  test('parses model_api links lines, keeping | inside URLs', () => {
    const { meta, error } = parseMeta(
      'model_api',
      form({
        links: [
          'Docs | https://example.com/docs',
          '',
          '  Weird | https://example.com/a|b  ',
        ].join('\n'),
      }),
    )
    expect(error).toBeUndefined()
    expect(meta?.links).toEqual([
      { label: 'Docs', url: 'https://example.com/docs' },
      { label: 'Weird', url: 'https://example.com/a|b' },
    ])
  })

  test('rejects a link line without a URL', () => {
    const { error } = parseMeta('model_api', form({ links: 'just a label' }))
    expect(error).toContain('links')
  })

  test('coerces course estimatedHours and rejects NaN', () => {
    const ok = parseMeta('course', form({ estimatedHours: '2.5' }))
    expect(ok.meta).toEqual({ estimatedHours: 2.5 })

    const empty = parseMeta('course', form({ estimatedHours: '' }))
    expect(empty.meta).toEqual({})

    const bad = parseMeta('course', form({ estimatedHours: 'many' }))
    expect(bad.error).toContain('estimatedHours')
  })
})

describe('slugSchema', () => {
  test.each(['a', 'my-tool', 'a1-b2-c3'])('accepts %s', (slug) => {
    expect(slugSchema.safeParse(slug).success).toBe(true)
  })

  test.each(['-lead', 'trail-', 'UPPER', 'sp ace', 'under_score', ''])(
    'rejects %s',
    (slug) => {
      expect(slugSchema.safeParse(slug).success).toBe(false)
    },
  )
})

describe('section maps', () => {
  test('sectionForType and typeForSection round-trip', () => {
    for (const [type, section] of Object.entries(sectionForType)) {
      expect(typeForSection[section]).toBe(type as never)
    }
  })
})
