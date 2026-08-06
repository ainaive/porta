import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import { user } from './auth'

export const resourceType = pgEnum('resource_type', [
  'tool',
  'course',
  'video',
  'model_api',
])

export const resourceStatus = pgEnum('resource_status', ['draft', 'published'])

export const contentLocale = pgEnum('content_locale', ['en', 'zh'])

export const resources = pgTable(
  'resources',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    type: resourceType('type').notNull(),
    slug: text('slug').notNull(),
    status: resourceStatus('status').notNull().default('draft'),
    tags: text('tags').array().notNull().default([]),
    // Type-specific fields (embed URL, external links, course level...),
    // validated against the per-type zod schema in src/lib/resource-meta.ts.
    meta: jsonb('meta').notNull().default({}),
    createdBy: text('created_by').references(() => user.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex('resources_type_slug_uq').on(t.type, t.slug),
    index('resources_tags_idx').using('gin', t.tags),
    index('resources_status_idx').on(t.status),
  ],
)

export const resourceTranslations = pgTable(
  'resource_translations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    resourceId: uuid('resource_id')
      .notNull()
      .references(() => resources.id, { onDelete: 'cascade' }),
    locale: contentLocale('locale').notNull(),
    title: text('title').notNull(),
    summary: text('summary').notNull().default(''),
    // Markdown
    body: text('body').notNull().default(''),
  },
  (t) => [
    uniqueIndex('resource_translations_resource_locale_uq').on(
      t.resourceId,
      t.locale,
    ),
  ],
)

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
  (t) => [uniqueIndex('course_chapters_course_position_uq').on(t.courseId, t.position)],
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
