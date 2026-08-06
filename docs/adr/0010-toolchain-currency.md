# 0010 — The lint and type toolchain tracks eslint-config-next, not `latest`

- **Status**: accepted
- **Date**: 2026-08-06

## Context

A dependency currency pass found the tree almost entirely up to date, and
two of the three stragglers — ESLint and TypeScript — turned out to be
pinned by something other than neglect. `eslint.config.mjs` is twenty lines
that compose `eslint-config-next`, so that one package decides which ESLint
and which TypeScript the repo can actually run. Because `lint` runs with
`--max-warnings 0` and gates CI, guessing wrong there stops the verify gate
rather than merely printing a warning.

Without this written down the versions look simply stale, and the obvious
"helpful" fix — install the newest ESLint and TypeScript — breaks the build
in a way that takes a while to trace back to a peer range.

## Decision

ESLint and TypeScript track what `eslint-config-next` supports rather than
what npm tags `latest`. Two bumps are deliberately deferred:

- **ESLint stays on 9.** `eslint-config-next` bundles
  `eslint-plugin-import`, `eslint-plugin-react` and `eslint-plugin-jsx-a11y`,
  none of which has an ESLint 10 release. Since `eslint-config-next` is
  version-locked to `next`, ESLint moves when Next does.
- **TypeScript stays on 6.** TypeScript 7 ships without the JavaScript
  compiler API, and `typescript-eslint@8` needs it (peer:
  `typescript >=4.8.4 <6.1.0`). Next itself is already fine with 7 — it runs
  the project-local `tsc` CLI for build-time checking — so the lint stack is
  the only thing holding this back.

Rejected: installing both anyway behind peer-range overrides (trades a green
gate for an unsupported plugin stack with no upstream fix available);
disabling the lint step to unblock TypeScript 7 (gives up the gate to chase
a version number).

`@types/node` follows a different rule — it tracks the runtime we deploy on
(Node 24, see [0006](0006-bun-tooling-node-runtime.md)), not the newest
published types, so it will normally sit behind `latest` too.

## Consequences

- `bun outdated` is expected to show `eslint` and `typescript` behind. That
  is the documented state, not drift; check this ADR before "fixing" it.
- Unblock conditions are concrete: ESLint 10 lands when a `next` upgrade
  brings an `eslint-config-next` whose bundled plugins support it.
  TypeScript 7 lands when `typescript-eslint` ships support for the
  API-less compiler. Neither needs a decision, just a released version.
- TypeScript 6 was taken now rather than waiting, because it aligns
  semantics with 7 while keeping the compiler API — the 7 migration becomes
  a version bump instead of a jump across two behaviour changes at once.
- TypeScript 6 dropped implicit inclusion of every `node_modules/@types`
  package, so `tsconfig.json` now names its global type packages in
  `compilerOptions.types`. Anything new that supplies globals rather than
  module exports has to be added there or it will silently not load.
