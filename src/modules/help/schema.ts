import {
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import { contentLocale, resources } from '@/db/schema'

// Tables this module owns. Chapters are course-specific — they need hard
// ordering and none of the resource machinery (slugs, statuses, types), which
// is why ADR 0001 gave them their own tables rather than making them child
// resources. They live here so the help team can evolve them without touching
// the shared kernel; drizzle-kit picks the file up via the schema glob in
// drizzle.config.ts.
//
// Positions are dense 1..n and URLs are positional, so reordering swaps
// positions (two-phase, to satisfy the unique index) and deletion renumbers.
export const courseChapters = pgTable(
  'course_chapters',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    courseId: uuid('course_id')
      .notNull()
      .references(() => resources.id, { onDelete: 'cascade' }),
    position: integer('position').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex('course_chapters_course_position_uq').on(
      t.courseId,
      t.position,
    ),
  ],
)

export const courseChapterTranslations = pgTable(
  'course_chapter_translations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    chapterId: uuid('chapter_id')
      .notNull()
      .references(() => courseChapters.id, { onDelete: 'cascade' }),
    locale: contentLocale('locale').notNull(),
    title: text('title').notNull(),
    // Markdown
    body: text('body').notNull().default(''),
  },
  (t) => [
    uniqueIndex('course_chapter_translations_chapter_locale_uq').on(
      t.chapterId,
      t.locale,
    ),
  ],
)

export type ChapterRow = typeof courseChapters.$inferSelect
export type ChapterTranslationRow =
  typeof courseChapterTranslations.$inferSelect
