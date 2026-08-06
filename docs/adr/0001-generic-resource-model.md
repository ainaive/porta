# 0001 — One generic resource model for all content sections

- **Status**: accepted
- **Date**: 2026-08-06

## Context

Porta launches with four content sections (tools, courses, videos, model
APIs) and is explicitly expected to grow more. Each section could have been
its own tables and pages — four small products — or one shared content
system with type-specific rendering.

## Decision

A single `resources` table carries every section: `type` enum, slug unique
per type, draft/published status, `tags text[]`, and a `meta` jsonb column
for type-specific fields validated at write time against a per-type zod
schema (`src/lib/resource-meta.ts`). Per-locale content lives in
`resource_translations` rows. Courses get dedicated `course_chapters`
tables (not child resources) because chapters need hard ordering and none of
the resource machinery (slugs, statuses, types).

Rejected: per-vertical tables (four times the schema, queries, and admin
code); modeling chapters as child resources (complicates every query for no
benefit); a tags join table (premature — `text[]` with a GIN index covers
v1 filtering and migrates mechanically later).

## Consequences

- A new section = enum value + meta zod schema + listing/detail pages +
  nav/messages. No schema surgery (see docs/architecture.md).
- Type-specific data is invisible to SQL (jsonb); anything that needs
  querying by meta field must move to a real column first.
- All sections share one admin editor, one fallback policy, one publish
  rule.
