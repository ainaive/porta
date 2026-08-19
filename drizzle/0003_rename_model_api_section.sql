-- The model_api section moves under the AI Evaluation module as its `model`
-- section (ADR 0013). Slugs are unique per (type, slug), and no other section
-- uses these slugs, so the rename cannot collide.
UPDATE "resources" SET "type" = 'model' WHERE "type" = 'model_api';
