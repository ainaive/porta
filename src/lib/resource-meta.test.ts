import { describe, expect, test } from 'bun:test'
import { parseMeta, resourceTypes, slugSchema } from './resource-meta'

// The per-section zod schemas are tested by the modules that own them
// (src/modules/*/module.test.ts). What is tested here is the generic
// write-time path: form fields → candidate object → the module's schema.

function form(entries: Record<string, string>): FormData {
  const data = new FormData()
  for (const [key, value] of Object.entries(entries)) data.set(key, value)
  return data
}

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

  test('parses lines fields, keeping | inside URLs', () => {
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

  test('coerces number fields and rejects NaN', () => {
    const ok = parseMeta('course', form({ estimatedHours: '2.5' }))
    expect(ok.meta).toEqual({ estimatedHours: 2.5 })

    const empty = parseMeta('course', form({ estimatedHours: '' }))
    expect(empty.meta).toEqual({})

    const bad = parseMeta('course', form({ estimatedHours: 'many' }))
    expect(bad.error).toContain('estimatedHours')
  })

  test('required fields submit empty strings so the schema can reject them', () => {
    // `video.embedUrl` is required: an empty input must fail validation
    // rather than silently drop out of the object.
    const { error } = parseMeta('video', form({ provider: 'youtube' }))
    expect(error).toContain('embedUrl')
  })

  test('an unregistered section is rejected, not stored', () => {
    const { meta, error } = parseMeta(
      'not-a-section' as (typeof resourceTypes)[number],
      form({}),
    )
    expect(meta).toBeUndefined()
    expect(error).toContain('unregistered')
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
