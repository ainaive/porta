-- The AI Evaluation module and the Videos section are retired: the portal's
-- content directory is now Tools, Docs, Getting started and Events. The site
-- has never been public, so these rows are dropped rather than migrated.
--
-- resource_translations cascades on resources.id; no course_chapters row can
-- reference these types, so nothing else needs cleaning up.
DELETE FROM "resources" WHERE "type" IN ('agent', 'model', 'report', 'video');
