# 0017 — One light canvas: the Workbench visual system

- **Status**: accepted
- **Date**: 2026-09-03

Supersedes [ADR 0008](./0008-landing-visual-system.md).

## Context

[ADR 0008](./0008-landing-visual-system.md) built the site around one dark
surface. A `.landing` token scope re-pointed the palette on `/` alone, opened
by `ChromeShell` reading the pathname, and the page inside it was a composition
of ambient glows, a gradient headline, a display face and a 6-column bento of
tiles. Everything else stayed on an achromatic light palette that no accent
ever entered — the brand colour was explicitly "a landing and brand-mark
colour, not a general-purpose UI colour".

A new design was imported from claude.ai/design (*Developer portal website
design*). It is light throughout, warm rather than achromatic, and uses its
accent as a working UI colour: links, kickers, the active nav marker, chart
bars. It has no rounded corners, no shadows and no gradients — hairline rules
do all the separating — and it is denser than what it replaces, built around
tables and filter panels rather than cards.

Retuning the old system into it was not possible. Every alpha-on-dark surface
(`bg-white/4`, `border-white/12`) inverts to nothing on paper, the glows have
nowhere to bloom, and the display face has no role in a design whose headings
are the sans at 600.

## Decision

- **One canvas, so a colour is defined once.** `.landing` and `.dark` are both
  deleted, and with them `ChromeShell`, which existed only to open the scope.
  The layout renders header, page and footer directly. `.dark` had no toggle
  and no route that reached it; a palette nothing can display is a second
  system to maintain for no reader.
- **The accent is a UI colour now.** Rust enters links, kickers, the active nav
  underline, the adoption bars and every focus ring. ADR 0008's "app chrome
  stays achromatic" no longer holds, because the design it was protecting is
  gone.
- **Squaring the design is one token.** `--radius: 0`, and every primitive
  re-squares through the multiplier ladder that already existed. Only two
  hardcoded their own corners — `Badge`'s `rounded-4xl` and `Button`'s size
  variants — and only the first needed changing.
- **Two font families, not five.** Libre Franklin replaces Geist *and* Sora;
  Roboto Mono replaces JetBrains Mono; Noto Sans SC is unchanged, `preload:
  false` and all, for the reason ADR 0008 gives. `--font-display-stack` points
  at the sans rather than being deleted: the design has no display face, but
  the token is still what `font-display` resolves to across the primitives, and
  removing it would mean touching every one of them.
- **Five tokens the shadcn set has no name for** — `--panel`,
  `--surface-hover`, `--rule`, `--label`, `--faint` — plus three status pairs
  for the maturity badges. The design leans on all of them constantly, and
  spelling them as one-off alphas in markup is what made the old landing
  impossible to retune.
- **The claim rule survives the redesign that replaced its subject.** ADR 0008
  required every line of landing copy to be checked against shipped
  capability, and an e2e test asserts the removed claims stay removed. The rule
  is unchanged and the test is kept — re-aimed, because this artboard invents a
  different product. See [ADR 0018](./0018-portal-content-directory.md).

Rejected: **keeping `.dark` for a future theme toggle.** Nothing in the design
asks for one, and an unreachable palette rots — it would be wrong by the time
anything wanted it. Reintroducing it means mounting a `ThemeProvider` and
re-deciding the whole palette anyway. Also rejected: **a `.workbench` scope
mirroring `.landing`**, which would keep the indirection for a system that now
has exactly one surface.

## Consequences

- Every page changes, not one. The old split meant a chrome change had to be
  checked on two canvases; now there is one, which is simpler but means a
  token change has no surface left to hide on.
- `next build` no longer downloads Sora or JetBrains Mono. Noto Sans SC still
  dominates the font budget.
- `--radius: 0` is load-bearing for the whole look. Setting it back to a
  non-zero value does not restore ADR 0008's design, it produces a third one.
- The `dark:` variants inside the shadcn primitives are now dead code. They are
  left in place rather than stripped: they cost nothing at runtime, and
  removing them by hand across sixteen files is a large diff that makes future
  `shadcn` updates conflict.
