# syntax=docker/dockerfile:1
# Bun for install/build, Node for the production runtime. Both stages are
# Debian/glibc — sharp's native binding is built in the bun stage and must
# match the runtime libc, so never swap the runtime for alpine/musl.

# Pinned to the packageManager version, not floating `1`: this stage resolves
# bun.lock, so --frozen-lockfile is only as reproducible as the bun reading it.
FROM oven/bun:1.3.14 AS deps
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Build on Node, not Bun: `next build` is a production workload, and running
# it under bun-as-node has crashed on CI hardware (segfault at exit). The bun
# binary is copied in only for the migrator bundling step.
FROM node:24-bookworm-slim AS build
COPY --from=oven/bun:1.3.14 /usr/local/bin/bun /usr/local/bin/bun
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# BUILD_STANDALONE is what makes next.config.ts emit .next/standalone; it is
# off by default so Vercel's adapter-driven build doesn't trip over it.
ENV NEXT_TELEMETRY_DISABLED=1 \
    BUILD_STANDALONE=1
# No database is reachable at build time: every DB-backed page is
# force-dynamic and the db client is lazy, so the build never connects.
RUN node node_modules/next/dist/bin/next build
# The standalone output bundles app deps into server chunks, so the migration
# script gets its own self-contained bundle (drizzle-orm + postgres inlined).
RUN bun build --target=node scripts/migrate.mjs --outfile=migrate.bundle.mjs

FROM node:24-bookworm-slim AS run
WORKDIR /app
ENV NODE_ENV=production \
    HOSTNAME=0.0.0.0 \
    PORT=3000 \
    NEXT_TELEMETRY_DISABLED=1
RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nextjs
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=build --chown=nextjs:nodejs /app/public ./public
COPY --from=build --chown=nextjs:nodejs /app/drizzle ./drizzle
COPY --from=build --chown=nextjs:nodejs /app/migrate.bundle.mjs ./scripts/migrate.mjs
COPY --chown=nextjs:nodejs docker-entrypoint.sh ./
USER nextjs
EXPOSE 3000
ENTRYPOINT ["/bin/sh", "./docker-entrypoint.sh"]
