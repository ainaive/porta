# 0008 — Landing visual system: a dark token scope, a brand accent, and copy limited to shipped capability

- **Status**: superseded by [0017](./0017-workbench-visual-system.md)
- **Date**: 2026-08-06

## Context

The landing page was a grey `h1`, four identical section cards, and a latest
grid on white. It had nothing to build a first impression out of: every colour
token in `globals.css` had chroma 0, there was no display face, and
`--font-sans` was declared as `var(--font-sans)` — a self-reference — so Geist
never applied and the whole site rendered in the browser default.

A design was imported from claude.ai/design (`Porta Landing v3`): near-black
canvas, warm accent, Sora display type, mono kickers, a bento grid, and a
product preview. It also described a product Porta isn't — SSO sign-in, a
`porta keys create` CLI issuing API keys, ⌘K global search, course progress
tracking, and live tool status — and omitted the Videos section entirely.

## Decision

- **The landing is a token scope, not a set of hex literals.** A `.landing`
  class re-points `--background`, `--foreground`, `--card`, `--border` and
  friends at the design's palette, and is applied together with `.dark` so the
  shadcn primitives' `dark:` variants stay correct. Everything inside styles
  itself with ordinary `bg-background` / `text-muted-foreground` /
  `border-border`, so a retune is one block of CSS rather than a sweep through
  markup. `body:has(.landing)` carries the canvas colour out to the overscroll
  gutter, which paints from the body background.
- **The scope is opened by a client shell, not by moving routes.**
  `ChromeShell` reads the locale-stripped pathname and wraps the header, page
  and footer. Route groups would be the more idiomatic split but mean moving
  ten route directories for one page; revisit if marketing pages multiply.
- **A brand accent enters an otherwise achromatic system.** `--brand`,
  `--brand-2` and `--brand-3` live in `:root` as constants. The app chrome
  stays achromatic on purpose — the accent is a landing and brand-mark colour,
  not a general-purpose UI colour.
- **Three font families ship**: Sora (display), JetBrains Mono (kickers, code
  panels, the landing's mono), Noto Sans SC (Han). Noto Sans SC is loaded with
  `preload: false` and no `subsets`, because Google publishes no named CJK
  subset for it and its Han glyphs arrive as ~120 unicode-range chunks; a zh
  page pulls about 18 of them. Latin body copy stays on Geist rather than the
  design's Noto-first stack, which put English text in a CJK face.
- **Landing copy describes only shipped capability.** Every claim in the
  imported design was checked against `CONTEXT.md` and rewritten where it did
  not hold: SSO became the real invite-only access model (ADR 0002), the CLI
  panel became a real model API resource's provider and endpoint read from its
  `meta`, ⌘K became per-section search and tag filtering, the progress bar
  became real course and chapter counts, and invented tool names with
  OPERATIONAL/MAINTENANCE status became the newest published tools labelled
  with their own tags. The tiles are fed by `getHomeOverview`, so the page is
  a view of the catalog rather than a picture of one. An e2e test asserts the
  removed claims stay removed.

Rejected: implementing the design's copy as aspirational marketing (a landing
page that lies about the product is a support burden and an onboarding trap);
wiring `next-themes` site-wide (every existing page would need a dark pass for
one dark surface); re-toning the design to work in light and dark (loses the
contrast the composition depends on); `overflow-x-hidden` to contain the
ambient glows (`hidden` on one axis computes the other to `auto`, turning the
container into a scroll trap — `overflow-x-clip` is exempt).

## Consequences

- Fixing `--font-sans` changes type on every page, not just the landing; the
  same dead reference was also breaking `--font-heading`, so `CardTitle`,
  `DialogTitle` and `SheetTitle` change too.
- `next build` downloads several MB of Noto Sans SC woff2. `docker compose
  build` in CI pays that on a cold cache.
- Chinese now has a declared font family site-wide, which it did not before.
- A second surface exists that reviewers must check when touching shared
  chrome: the header and footer render on both a light and a dark canvas.
- New landing copy needs a claim check, not just a translation. Adding a
  capability line means either shipping the capability or not shipping the
  line.
