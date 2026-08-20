import type { ZodType } from 'zod'
import type { Locale } from '@/i18n/routing'

// The contract a feature module publishes to the platform. Manifests are
// PURE DATA: no JSX, no database, no server-only imports. `src/proxy.ts`
// (middleware) reaches the registry through `src/lib/gating.ts`, and the
// admin form renders from `metaFields` descriptors rather than from module
// components — both break if a manifest drags rendering in with it.

/** One `<option>` of a select-kind meta field. Labels are literal, not keys:
 *  they are proper nouns (YouTube, Bilibili) or the stored value itself. */
export type MetaFieldOption = { value: string; label: string }

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
}

// `const` type parameter so section keys and paths stay literal types: that
// is what keeps `ResourceType` a closed union rather than plain `string`.
export function defineModule<const T extends FeatureModule>(module: T): T {
  return module
}
