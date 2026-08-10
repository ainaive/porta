CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
CREATE INDEX "resource_translations_title_trgm" ON "resource_translations" USING gin ("title" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "resource_translations_summary_trgm" ON "resource_translations" USING gin ("summary" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "resource_translations_body_trgm" ON "resource_translations" USING gin ("body" gin_trgm_ops);
