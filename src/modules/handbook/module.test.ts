import { describe, expect, test } from 'bun:test'
import { docMeta, trackMeta } from './module'

describe('track meta', () => {
  test('level is a closed enum', () => {
    expect(trackMeta.safeParse({ level: 'beginner' }).success).toBe(true)
    expect(trackMeta.safeParse({ level: 'expert' }).success).toBe(false)
  })

  test('estimatedHours must be positive', () => {
    expect(trackMeta.safeParse({ estimatedHours: 3 }).success).toBe(true)
    expect(trackMeta.safeParse({ estimatedHours: 0 }).success).toBe(false)
  })
})

describe('doc meta', () => {
  // `group` drives the Docs listing's rows, so an unrecognised value would
  // render a group heading nobody has a translation for.
  test('group is a closed enum', () => {
    expect(docMeta.safeParse({ group: 'foundations' }).success).toBe(true)
    expect(docMeta.safeParse({ group: 'misc' }).success).toBe(false)
  })

  test('readingTime is free text', () => {
    for (const readingTime of ['8 min read', 'Reference', 'Policy']) {
      expect(docMeta.safeParse({ readingTime }).success).toBe(true)
    }
  })

  test('sourceUrl must be a URL', () => {
    expect(docMeta.safeParse({ sourceUrl: 'https://x.test' }).success).toBe(
      true,
    )
    expect(docMeta.safeParse({ sourceUrl: 'not-a-url' }).success).toBe(false)
  })
})
