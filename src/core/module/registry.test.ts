import { describe, expect, test } from 'bun:test'
import coreEn from '../../../messages/en.json'
import coreZh from '../../../messages/zh.json'
import type { FeatureModule } from './define'
import {
  gatedModulePatterns,
  messageKey,
  metaFieldLabelKey,
  metaFieldOptionLabelKey,
  navEntries,
  sectionDescriptionKey,
  sectionForPath,
  sectionPath,
  sections,
  sectionTitleKey,
} from './derive'
import { modules } from './registry'

// The contract every module must satisfy. These run without a database, so
// `bun run verify` turns "adding a module" into a self-checking operation: a
// manifest that collides with another module, or that references a message
// key it does not ship, fails here rather than in production.

const locales = ['en', 'zh'] as const

function flatKeys(value: unknown, prefix = ''): string[] {
  if (typeof value !== 'object' || value === null) return [prefix]
  return Object.entries(value).flatMap(([key, child]) =>
    flatKeys(child, prefix ? `${prefix}.${key}` : key),
  )
}

/** Every message key the app ships: a module's, namespaced by module id, and
 *  core's own, which are unnamespaced — `coreNav` names those, so the nav
 *  check below has to see both. */
async function absoluteKeys(locale: 'en' | 'zh'): Promise<Set<string>> {
  const perModule = await Promise.all(
    modules.map(async (feature) =>
      flatKeys((await feature.messages[locale]()).default).map(
        (key) => `${feature.id}.${key}`,
      ),
    ),
  )
  // Statically imported: boundaries.test.ts fails closed on a dynamic import
  // it cannot reduce to a path, and a template literal is exactly that.
  const core = flatKeys(locale === 'en' ? coreEn : coreZh)
  return new Set([...perModule.flat(), ...core])
}

describe('registry shape', () => {
  test('module ids are unique and kebab-case', () => {
    const ids = modules.map((feature) => feature.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const id of ids) expect(id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  })

  test('module ids do not shadow a core message namespace', () => {
    const core = new Set(Object.keys(coreEn))
    for (const feature of modules) {
      expect({ [feature.id]: core.has(feature.id) }).toEqual({
        [feature.id]: false,
      })
    }
  })

  test('section keys are globally unique', () => {
    const keys = sections.map((section) => section.key)
    expect(new Set(keys).size).toBe(keys.length)
  })

  test('section keys are safe to store in resources.type', () => {
    for (const section of sections) {
      expect(section.key).toMatch(/^[a-z0-9]+(?:_[a-z0-9]+)*$/)
    }
  })

  test('section paths are unique and round-trip to their section', () => {
    const paths = sections.map((section) => section.path)
    expect(new Set(paths).size).toBe(paths.length)
    for (const section of sections) {
      expect(section.path).toMatch(/^(\/[a-z0-9-]+)+$/)
      expect(sectionForPath(section.path)?.key).toBe(section.key)
      expect(sectionPath(section.key)).toBe(section.path)
    }
  })

  test('meta field names are unique within a section', () => {
    for (const section of sections) {
      const names = section.metaFields.map((field) => field.name)
      expect({ [section.key]: new Set(names).size }).toEqual({
        [section.key]: names.length,
      })
    }
  })

  test('a landing tile only quotes meta fields its section declares', () => {
    for (const section of sections) {
      const tile = section.landingTile
      if (!tile) continue
      const names = section.metaFields.map((field) => field.name)
      for (const quoted of tile.fields ?? []) {
        // The tile resolves each label through the matching MetaField, so a
        // name with no descriptor would render as the raw name — and the
        // panel would silently drift away from the admin form it quotes.
        expect({
          [`${section.key}.${quoted}`]: names.includes(quoted),
        }).toEqual({ [`${section.key}.${quoted}`]: true })
      }
    }
  })

  test('only a fields tile names fields, and it names at least one', () => {
    for (const section of sections) {
      const tile = section.landingTile
      if (!tile) continue
      const count = tile.fields?.length ?? 0
      expect({
        [section.key]: tile.kind === 'fields' ? count > 0 : count === 0,
      }).toEqual({ [section.key]: true })
    }
  })

  test('a grouped listing groups by a select meta field it declares', () => {
    for (const section of sections) {
      const listing = section.listing
      if (listing?.kind !== 'grouped') continue
      const field = section.metaFields.find((f) => f.name === listing.groupBy)
      // The layout renders one row per option of that descriptor, in the
      // order it declares them. A name with no descriptor renders no groups
      // at all, silently — every resource would fall into the catch-all.
      expect({
        [`${section.key}.${listing.groupBy}`]: field?.kind ?? 'missing',
      }).toEqual({ [`${section.key}.${listing.groupBy}`]: 'select' })
    }
  })

  test('a facet names a select meta field its section declares', () => {
    for (const section of sections) {
      for (const name of section.facets ?? []) {
        const field = section.metaFields.find((f) => f.name === name)
        // A facet resolves its label and its whole option list through the
        // matching MetaField. A name with no descriptor would render an empty
        // chip row; a non-select one has no closed set of values to count.
        expect({
          [`${section.key}.${name}`]: field?.kind ?? 'missing',
        }).toEqual({ [`${section.key}.${name}`]: 'select' })
      }
    }
  })

  test('select fields declare at least one option', () => {
    for (const section of sections) {
      for (const field of section.metaFields) {
        if (field.kind !== 'select') continue
        expect({
          [`${section.key}.${field.name}`]: field.options?.length ?? 0,
        }).not.toEqual({ [`${section.key}.${field.name}`]: 0 })
      }
    }
  })
})

// frameSrc is the one field on a manifest that widens a security policy, and
// `defineModule` is an identity function by design — the manifest is reached
// by the middleware, so it stays pure data with no runtime validation. The
// contract is enforced here instead, like the rest of it: a module that
// declares a wildcard, a CSP keyword, a path or an http origin fails
// `bun run verify` rather than silently loosening frame-src for everyone.
describe('declared frame sources', () => {
  // Through the widened view, as derive.ts does: the `const` type parameter
  // on defineModule drops optional properties a manifest didn't set, so
  // `modules[n].frameSrc` does not typecheck for the modules without one.
  const declared: readonly FeatureModule[] = modules
  const origins = declared.flatMap((feature) =>
    (feature.frameSrc ?? []).map((origin) => [feature.id, origin] as const),
  )

  test('are bare origins, not URLs with a path or CSP source expressions', () => {
    for (const [id, origin] of origins) {
      // URL.origin strips path, query, hash and credentials, so requiring the
      // round-trip rejects all of them at once. '*', "'self'", 'data:' and
      // 'https:' do not parse as URLs at all.
      expect({ [`${id}: ${origin}`]: URL.parse(origin)?.origin }).toEqual({
        [`${id}: ${origin}`]: origin,
      })
    }
  })

  test('are https, so no module can downgrade what the page embeds', () => {
    for (const [id, origin] of origins) {
      expect({ [`${id}: ${origin}`]: URL.parse(origin)?.protocol }).toEqual({
        [`${id}: ${origin}`]: 'https:',
      })
    }
  })
})

describe('navigation', () => {
  test('entries are sorted by order and point at unique hrefs', () => {
    const orders = navEntries.map((entry) => entry.order)
    expect(orders).toEqual([...orders].sort((a, b) => a - b))
    const hrefs = navEntries.map((entry) => entry.href)
    expect(new Set(hrefs).size).toBe(hrefs.length)
  })
})

describe('gating', () => {
  test('detail pages are gated but listings stay public', () => {
    const gated = (path: string) =>
      gatedModulePatterns.some((pattern) => pattern.test(path))
    for (const section of sections) {
      if (section.gated === false) continue
      expect({ [section.path]: gated(section.path) }).toEqual({
        [section.path]: false,
      })
      expect({ [section.path]: gated(`${section.path}/a-slug`) }).toEqual({
        [section.path]: true,
      })
    }
  })
})

describe('message keys', () => {
  for (const locale of locales) {
    test(`every key a manifest references exists in the ${locale} bundles`, async () => {
      const shipped = await absoluteKeys(locale)
      const missing: string[] = []

      for (const entry of navEntries) {
        if (!shipped.has(entry.labelKey)) missing.push(entry.labelKey)
      }
      for (const section of sections) {
        const tile = section.landingTile
        const referenced = [
          sectionTitleKey(section.key),
          sectionDescriptionKey(section.key),
          ...section.metaFields.map((field) =>
            metaFieldLabelKey(section, field),
          ),
          // A landing tile names copy the same way a section does, so it has
          // to be checked the same way — otherwise the one thing this test
          // exists to guarantee would silently exclude the newest thing a
          // manifest can say.
          ...(tile
            ? [
                messageKey(section.moduleId, tile.titleKey),
                messageKey(section.moduleId, tile.descriptionKey),
              ]
            : []),
          // An option that translates its label names a key too, and it is
          // the one a reader sees most often — every facet chip on a listing.
          ...section.metaFields.flatMap((field) =>
            (field.options ?? [])
              .map((option) => metaFieldOptionLabelKey(section, option))
              .filter((key): key is string => key !== null),
          ),
        ]
        for (const key of referenced) {
          // A manifest may only name strings in its own namespace.
          expect(key.startsWith(`${section.moduleId}.`)).toBe(true)
          if (!shipped.has(key)) missing.push(key)
        }
      }

      expect(missing).toEqual([])
    })
  }
})
