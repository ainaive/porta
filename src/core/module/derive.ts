import type {
  FeatureModule,
  MetaField,
  NavEntry,
  SectionDefinition,
} from './define'
import { modules } from './registry'

// `modules` keeps literal types so `SectionKey` stays a closed union; that
// same inference drops optional properties a manifest didn't set, so read
// them through the widened view instead.
const declared: readonly FeatureModule[] = modules

// Everything the platform used to keep in hand-maintained lists — the nav
// arrays in the header and footer, the gated-path regexes, the section/type
// maps, the meta schema table — is computed here from the registry instead.

/** The closed union of `resources.type` values, from the manifests' literal
 *  section keys. A section that is not registered cannot be stored. */
export type SectionKey = (typeof modules)[number]['sections'][number]['key']

export type ResolvedSection = SectionDefinition & {
  key: SectionKey
  moduleId: string
}

export const sections: readonly ResolvedSection[] = modules.flatMap((feature) =>
  feature.sections.map((section) => ({
    ...section,
    moduleId: feature.id,
  })),
) as ResolvedSection[]

export const sectionKeys = sections.map((section) => section.key)

const byKey = new Map(sections.map((section) => [section.key, section]))
const byPath = new Map(sections.map((section) => [section.path, section]))

export function findSection(key: string): ResolvedSection | undefined {
  return byKey.get(key as SectionKey)
}

/** For call sites that already hold a validated `SectionKey`. */
export function getSection(key: SectionKey): ResolvedSection {
  const section = byKey.get(key)
  if (!section) throw new Error(`Unregistered section key: ${key}`)
  return section
}

export function sectionForPath(path: string): ResolvedSection | undefined {
  return byPath.get(path)
}

export function isSectionKey(value: unknown): value is SectionKey {
  return typeof value === 'string' && byKey.has(value as SectionKey)
}

/** Listing path, e.g. '/tools'. Detail pages are `${path}/${slug}`. */
export function sectionPath(key: SectionKey): string {
  return getSection(key).path
}

// ---------- Message keys ----------

// Module message bundles are merged under the module id, so a manifest
// declares keys relative to its own namespace and can never name another
// module's strings.
export function messageKey(moduleId: string, relative: string): string {
  return `${moduleId}.${relative}`
}

export function sectionTitleKey(key: SectionKey): string {
  const section = getSection(key)
  return messageKey(section.moduleId, section.titleKey)
}

export function sectionDescriptionKey(key: SectionKey): string {
  const section = getSection(key)
  return messageKey(section.moduleId, section.descriptionKey)
}

export function metaFieldLabelKey(
  section: ResolvedSection,
  field: MetaField,
): string {
  return messageKey(section.moduleId, field.labelKey)
}

// ---------- Navigation ----------

export const navEntries: readonly NavEntry[] = modules
  .flatMap((feature) =>
    feature.nav.map((entry) => ({
      ...entry,
      labelKey: messageKey(feature.id, entry.labelKey),
    })),
  )
  .sort((a, b) => a.order - b.order)

// ---------- Gating ----------

function escape(path: string): string {
  return path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

const gatedSections = sections.filter((section) => section.gated !== false)

/** Detail pages under a gated section, plus whatever else a module declares.
 *  Listings stay public — the pattern requires a segment after the path. */
export const gatedModulePatterns: readonly RegExp[] = [
  ...gatedSections.map((section) => new RegExp(`^${escape(section.path)}/.+`)),
  ...declared.flatMap((feature) =>
    (feature.extraGatedPaths ?? []).map(
      (path) => new RegExp(`^${escape(path)}(/|$)`),
    ),
  ),
]

/** Paths gated at the path itself, rather than one segment below it. */
const modulePathsGatedOutright: readonly string[] = declared.flatMap(
  (feature) => feature.extraGatedPaths ?? [],
)

/** The same gating as `gatedModulePatterns`, as paths rather than patterns:
 *  robots.txt speaks in path prefixes and cannot consume a RegExp. Detail
 *  pages are `${section.path}/…`, so gating them is a prefix with a trailing
 *  slash — which leaves the listing itself crawlable, as it should be. */
export const gatedPathPrefixes: readonly string[] = [
  ...new Set([
    ...gatedSections.map((section) => `${section.path}/`),
    ...modulePathsGatedOutright,
  ]),
].sort()

/** Module indexes and section listings a signed-out visitor can read — the
 *  public surface, and so exactly what belongs in a sitemap. Anything a
 *  module gated outright drops out here rather than being remembered
 *  separately. */
export const publicPaths: readonly string[] = [
  ...new Set([
    ...navEntries.map((entry) => entry.href),
    ...sections.map((section) => section.path),
  ]),
]
  .filter(
    (path) =>
      !modulePathsGatedOutright.some(
        (gated) => path === gated || path.startsWith(`${gated}/`),
      ),
  )
  .sort()

// ---------- Redirects ----------

export const moduleRedirects: readonly { from: string; to: string }[] =
  declared.flatMap((feature) => feature.redirects ?? [])

// ---------- Content Security Policy ----------

/** Every external origin any module embeds, for the CSP's `frame-src`. A
 *  module widens the policy by declaring what it embeds; core never keeps a
 *  list of hosts, so a module that drops an embed narrows the policy for
 *  free. */
export const moduleFrameSrc: readonly string[] = [
  ...new Set(declared.flatMap((feature) => feature.frameSrc ?? [])),
].sort()
