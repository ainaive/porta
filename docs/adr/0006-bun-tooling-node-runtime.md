# 0006 — Bun for tooling, Node for the production runtime

- **Status**: accepted
- **Date**: 2026-08-06

## Context

The stack request named Bun. On Vercel, Next.js runs on Node regardless; in
Docker, the standalone output's well-trodden path is `node server.js`.
Running Bun in production would buy little and gamble on edge-case
compatibility.

## Decision

Bun is the package manager, dev runner, and test runner (`bun install`,
`bun dev`, `bun test`, seed scripts). Production runs Node 22 in both
targets. App code uses no Bun-only APIs. Because Next 16's standalone
output bundles server dependencies into chunks (leaving no node_modules for
external scripts), the migration script is bundled into a self-contained
file with `bun build --target=node` and executed by the container
entrypoint before the server starts; Vercel runs the same script from
node_modules during its build.

Rejected: Bun as production runtime (no meaningful win on Vercel,
compatibility risk in Docker); drizzle-kit in the runtime image (heavy —
committed SQL + the tiny programmatic migrator is enough).

## Consequences

- One toolchain locally, boring runtime in production; `bun.lock` is the
  single dependency truth (`--frozen-lockfile` in CI and Docker).
- Scripts that must run in production (migrations) are written as plain
  Node-compatible modules.
- drizzle-kit runs under Node even via bunx, so `drizzle.config.ts` loads
  dotenv explicitly.
