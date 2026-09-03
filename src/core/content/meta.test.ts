import { describe, expect, test } from 'bun:test'
import { parseMeta, resourceTypes, slugSchema } from './meta'

// The per-section zod schemas are tested by the modules that own them
// (src/modules/*/module.test.ts). What is tested here is the generic
// write-time path: form fields → candidate object → the module's schema.
//
// `parseMeta` reads the live registry, so a MetaField kind can only be
// exercised here while some registered section uses it. The `lines` kind
// currently has no consumer and is covered by no test — like `frameSrc`, it
// stays a supported seam rather than being removed for want of a caller.

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

  test('coerces number fields and rejects NaN', () => {
    const ok = parseMeta('track', form({ estimatedHours: '2.5' }))
    expect(ok.meta).toEqual({ estimatedHours: 2.5 })

    const empty = parseMeta('track', form({ estimatedHours: '' }))
    expect(empty.meta).toEqual({})

    const bad = parseMeta('track', form({ estimatedHours: 'many' }))
    expect(bad.error).toContain('estimatedHours')
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
