import { describe, expect, test } from 'bun:test'
import { groupChapters } from './chapters'
import type { ChapterRow, ChapterTranslationRow } from './schema'

// The locale-fallback policy itself is core (src/core/content/fallback.ts);
// what is tested here is applying it to this module's chapter rows.

describe('groupChapters', () => {
  function makeChapter(id: string, position: number): ChapterRow {
    return { id, courseId: 'c1', position, createdAt: new Date('2026-01-01') }
  }

  function makeChapterTranslation(
    chapterId: string,
    locale: 'en' | 'zh',
  ): ChapterTranslationRow {
    return {
      id: `${chapterId}-${locale}`,
      chapterId,
      locale,
      title: `${chapterId} ${locale}`,
      body: '',
    }
  }

  test('sorts by position and applies fallback per chapter', () => {
    const rows = [
      {
        chapter: makeChapter('ch2', 2),
        translation: makeChapterTranslation('ch2', 'en'),
      },
      {
        chapter: makeChapter('ch1', 1),
        translation: makeChapterTranslation('ch1', 'zh'),
      },
    ]
    const grouped = groupChapters(rows, 'en')
    expect(grouped.map((c) => c.position)).toEqual([1, 2])
    expect(grouped[0].isFallback).toBe(true)
    expect(grouped[1].isFallback).toBe(false)
  })

  test('drops chapters without translations', () => {
    const rows = [{ chapter: makeChapter('ch1', 1), translation: null }]
    expect(groupChapters(rows, 'en')).toHaveLength(0)
  })
})
