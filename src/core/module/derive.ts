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

/** Detail pages under a gated section, plus whatever else a module declares.
 *  Listings stay public — the pattern requires a segment after the path. */
export const gatedModulePatterns: readonly RegExp[] = [
  ...sections
    .filter((section) => section.gated !== false)
    .map((section) => new RegExp(`^${escape(section.path)}/.+`)),
  ...declared.flatMap((feature) =>
    (feature.extraGatedPaths ?? []).map(
      (path) => new RegExp(`^${escape(path)}(/|$)`),
    ),
  ),
]

// ---------- Redirects ----------

export const moduleRedirects: readonly { from: string; to: string }[] =
  declared.flatMap((feature) => feature.redirects ?? [])
