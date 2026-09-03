import {
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import { contentLocale, resources } from '@/db/schema'

// Tables this module owns. Steps are track-specific — they need hard
// ordering and none of the resource machinery (slugs, statuses, types), which
// is why ADR 0001 gave them their own tables rather than making them child
// resources. They live here so the handbook team can evolve them without
// touching the shared kernel; drizzle-kit picks the file up via the schema
// glob in drizzle.config.ts.
//
// Positions are dense 1..n and URLs are positional, so reordering swaps
// positions (two-phase, to satisfy the unique index) and deletion renumbers.
export const trackSteps = pgTable(
  'track_steps',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    trackId: uuid('track_id')
      .notNull()
      .references(() => resources.id, { onDelete: 'cascade' }),
    position: integer('position').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex('track_steps_track_position_uq').on(t.trackId, t.position),
  ],
)

export const trackStepTranslations = pgTable(
  'track_step_translations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    stepId: uuid('step_id')
      .notNull()
      .references(() => trackSteps.id, { onDelete: 'cascade' }),
    locale: contentLocale('locale').notNull(),
    title: text('title').notNull(),
    // Markdown
    body: text('body').notNull().default(''),
  },
  (t) => [
    uniqueIndex('track_step_translations_step_locale_uq').on(
      t.stepId,
      t.locale,
    ),
  ],
)

export type StepRow = typeof trackSteps.$inferSelect
export type StepTranslationRow = typeof trackStepTranslations.$inferSelect
