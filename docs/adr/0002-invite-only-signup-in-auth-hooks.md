# 0002 — Invite-only signup enforced in better-auth hooks, with first-user bootstrap

- **Status**: accepted
- **Date**: 2026-08-06

## Context

Porta is public-facing but for internal employees: no open registration.
Sign-up must be restricted in a way that cannot be bypassed by calling the
auth API directly, and the very first account needs a path in without an
inviter existing yet.

## Decision

Enforcement lives in better-auth's request hooks on `/sign-up/email`
(`src/lib/auth.ts`): the before-hook requires a valid, unused, unexpired
invite token (matching the invite's email when one is set), the after-hook
consumes the invite, and a database hook applies the invited role. When the
user table is empty, the first signup is allowed without an invite and
becomes `admin` (bootstrap), replacing any seed-user step. Invites are a
custom table with copyable tokenized links — no mail-service dependency in
v1.

Rejected: UI-only gating (trivially bypassed via the API); better-auth's
organization-plugin invitations (drags in org semantics Porta doesn't
have); email-delivered invites in v1 (adds a mail dependency; email slots
in later at exactly two points — invite creation and password reset).

## Consequences

- `curl` against the signup endpoint is part of the contract and is locked
  down by tests (`tests/db/auth-signup.test.ts`).
- Email landed in Phase 4 at the two anticipated points — invite creation and
  password reset (see [ADR 0012](./0012-email-delivery.md)). Self-service reset
  now exists; admins can also trigger a reset email. Copy-link invites remain
  for open (email-less) invites.
- The bootstrap rule means an empty database is momentarily open — fine for
  fresh deploys, worth knowing during database resets.
