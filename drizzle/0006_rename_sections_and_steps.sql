-- The Help & Tutorials module becomes the Handbook: `course` is now `track`
-- (Getting started) and `guide` is now `doc` (Docs & guides). Slugs are
-- unique per (type, slug) and neither target type exists yet, so neither
-- rename can collide.
UPDATE "resources" SET "type" = 'track' WHERE "type" = 'course';--> statement-breakpoint
UPDATE "resources" SET "type" = 'doc' WHERE "type" = 'guide';--> statement-breakpoint

-- A track's ordered sub-units are steps, not chapters. Renamed by hand rather
-- than through drizzle-kit, which emits drop-and-create for a table rename —
-- that would take the rows with it and still report success.
ALTER TABLE "course_chapters" RENAME TO "track_steps";--> statement-breakpoint
ALTER TABLE "course_chapter_translations" RENAME TO "track_step_translations";--> statement-breakpoint
ALTER TABLE "track_steps" RENAME COLUMN "course_id" TO "track_id";--> statement-breakpoint
ALTER TABLE "track_step_translations" RENAME COLUMN "chapter_id" TO "step_id";--> statement-breakpoint
ALTER INDEX "course_chapters_course_position_uq" RENAME TO "track_steps_track_position_uq";--> statement-breakpoint
ALTER INDEX "course_chapter_translations_chapter_locale_uq" RENAME TO "track_step_translations_step_locale_uq";
