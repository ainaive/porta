import type { ZodType } from 'zod'
import type { Locale } from '@/i18n/routing'

// The contract a feature module publishes to the platform. Manifests are
// PURE DATA: no JSX, no database, no server-only imports. `src/proxy.ts`
// (middleware) reaches the registry through `src/lib/gating.ts`, and the
// admin form renders from `metaFields` descriptors rather than from module
// components — both break if a manifest drags rendering in with it.

/** One `<option>` of a select-kind meta field. `label` is literal, for values
 *  that read the same in every locale — proper nouns (YouTube, Bilibili) or
 *  the stored value itself. A field whose options are ordinary words needs
 *  `labelKey` instead: it resolves against the owning module's namespace, and
 *  it is what lets a facet chip say "Observability" in one locale and
 *  "可观测性" in the other while the stored value stays stable. */
export type MetaFieldOption = {
  value: string
  label: string
  labelKey?: string
}

/** A type-specific field of `resources.meta`. Drives both the admin form and
 *  `parseMeta`, so a module adds a field without touching core. */
export type MetaField = {
  name: string
  /** Message key, resolved against the owning module's namespace. */
  labelKey: string
  kind: 'text' | 'number' | 'select' | 'lines'
  /** Column span in the admin form's two-column grid. Defaults to 'half'. */
  span?: 'half' | 'full'
  /** When false (the default) an empty input is submitted as `undefined` so
   *  optional zod fields drop out. Required fields submit '' and let zod
   *  produce the error. */
  required?: boolean
  placeholder?: string
  /** select */
  options?: readonly MetaFieldOption[]
  emptyOption?: boolean
  /** number */
  min?: string
  step?: string
  /** lines — renders a monospace textarea */
  mono?: boolean
}

/** What a section contributes to the landing page's bento grid. Data, like
 *  `metaFields`: core owns the grid, the spans, the numbering and the
 *  styling, and a module declares only what its tile says. A module cannot
 *  choose its own span — a 6-column bento is a shared composition, and one
 *  module's width constrains every other module's, so nothing per-module
 *  could validate that the rows still add up.
 *
 *  Opt-in on purpose (ADR 0008): a section earns a tile by having something
 *  to show, rather than being entitled to one. A tile is also suppressed
 *  whenever its section has no published resources — an empty tile reading
 *  `0` is worse than no tile. */
export type LandingTile = {
  /** How the tile's body renders:
   *  - `list`  — the section's preview resources, linked individually.
   *  - `stat`  — the published count, plus the newest resource's title.
   *  - `fields`— a code panel quoting `fields` from the newest resource
   *              that carries all of them. */
  kind: 'list' | 'stat' | 'fields'
  /** Message keys, resolved against the owning module's namespace. */
  titleKey: string
  descriptionKey: string
  /** `fields` kind only. Names entries in this section's own `metaFields`,
   *  not message keys: core resolves each label through the descriptor that
   *  already exists, so the tile cannot drift from the admin form, and
   *  `registry.test.ts` can check the names resolve. */
  fields?: readonly string[]
}

/** The public face of one resource type inside a module: its stored `type`
 *  value, its URL, its labels, and how its `meta` is validated. */
export type SectionDefinition = {
  /** Stored in `resources.type`. Globally unique across every module. */
  key: string
  /** Absolute, locale-less listing path, e.g. '/tools'. Detail pages hang
   *  off it as `${path}/${slug}`. */
  path: string
  /** Message keys, resolved against the owning module's namespace. */
  titleKey: string
  descriptionKey: string
  /** Validates `resources.meta` at write time (ADR 0001). */
  meta: ZodType
  metaFields: readonly MetaField[]
  /** Detail pages require a session. Defaults to true; listings stay public. */
  gated?: boolean
  /** This section's landing-page tile. Omit it and the section simply has no
   *  tile — the landing is derived from whichever sections declare one. */
  landingTile?: LandingTile
  /** How this section's listing renders its rows. Data, like `landingTile`:
   *  core owns every layout and a module names the one that suits its
   *  content, rather than shipping a component.
   *
   *  - `cards`   — the default grid. Good for short, self-describing entries.
   *  - `table`   — a dense row per resource. For a catalog people scan and
   *                compare rather than browse.
   *  - `grouped` — cards under a heading per value of `groupBy`, which must
   *                name a `select` meta field on this section. */
  listing?: { kind: 'cards' | 'table' } | { kind: 'grouped'; groupBy: string }
  /** Which `meta` fields this section's listing filters on, as chips with
   *  live counts. Names entries in this section's own `metaFields`, the same
   *  way `landingTile.fields` does — so a facet's label and its options come
   *  from the descriptor the admin form already renders and cannot drift
   *  from it. Only `select` fields qualify: a facet needs a closed set of
   *  values to count, and free text has none. */
  facets?: readonly string[]
}

/** A top-level navigation entry. A module contributes as many as it needs —
 *  one per section while sections are flat, one for the whole module once
 *  they live under a shared prefix. */
export type NavEntry = {
  href: string
  labelKey: string
  order: number
}

export type MessageLoader = () => Promise<{ default: Record<string, unknown> }>

export type FeatureModule = {
  /** Directory name, i18n namespace and ownership key, all at once. */
  id: string
  nav: readonly NavEntry[]
  sections: readonly SectionDefinition[]
  /** Per-locale message bundles, merged under `id` at request time. Static
   *  `import()` calls so the bundler can trace them. */
  messages: Readonly<Record<Locale, MessageLoader>>
  /** Gated paths beyond the section detail pages derived from `sections`. */
  extraGatedPaths?: readonly string[]
  /** Permanent redirects this module owns, locale-less and path-only. */
  redirects?: readonly { from: string; to: string }[]
  /** External origins this module embeds in an iframe, e.g. a video host.
   *  The CSP's `frame-src` is derived from these, so a module widens the
   *  policy by declaring what it embeds rather than by editing the policy —
   *  and a module that embeds nothing cannot widen it at all. Origins only
   *  (scheme + host [+ port]); a path here would be silently ignored by CSP. */
  frameSrc?: readonly string[]
}

// `const` type parameter so section keys and paths stay literal types: that
// is what keeps `ResourceType` a closed union rather than plain `string`.
export function defineModule<const T extends FeatureModule>(module: T): T {
  return module
}
