# 0012 — Email is Resend via the Marketplace, called over REST, with a dev log fallback

- **Status**: accepted
- **Date**: 2026-08-12

## Context

Phase 4 (account recovery) needs outbound email at the two points ADR 0002
anticipated: password-reset links and addressed invites. A user who forgot
their password previously had no recovery path. Email is an external service,
and ADR 0005 requires everything to work on both deploy targets — Vercel and
the self-hosted Docker container — with runtime env only.

## Decision

- **Resend, provisioned through the Vercel Marketplace.** It was the top
  (only) `messaging` result and is API-key based, so it satisfies the
  dual-target constraint: the Marketplace integration provisions
  `RESEND_API_KEY` on Vercel, and the same key drops into the Docker env. No
  Vercel-only binding.
- **Call Resend over its REST API (`fetch`), not the SDK.** Node 24 and Vercel
  both have `fetch`, so `src/lib/email.ts` posts to `api.resend.com/emails`
  with no dependency to keep in sync and identical behaviour on both targets.
- **Log instead of send when `RESEND_API_KEY` is unset.** Local dev, CI, and
  the window before the integration is provisioned all lack the key; rather
  than crash the auth flow, `sendEmail` logs the message (the reset link
  included) at warn level. The real send path activates the moment the key is
  present.
- **Wiring.** better-auth's `emailAndPassword.sendResetPassword` sends the
  reset link; `createInvite` emails the addressed invite (open invites stay
  copy-link only); an admin `sendUserResetEmail` action triggers the same
  reset email for a locked-out member. `EMAIL_FROM` must be on a
  Resend-verified domain in production.

## Consequences

- Locked-out users self-recover; onboarding can be email-driven instead of
  manual copy-link.
- Emails are best-effort: `sendEmail` never throws into the caller (a send
  failure is logged, not surfaced), so a Resend outage can't break sign-up or
  invite creation — at the cost of a silently undelivered email. Acceptable
  for an internal tool; a delivery/retry queue is the escape hatch if it
  matters later.
- Production must set `RESEND_API_KEY` and a verified `EMAIL_FROM`; a
  misconfigured deploy degrades to logging reset links (a warn log flags it),
  which is a security consideration to monitor.
