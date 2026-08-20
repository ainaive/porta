import { describe, expect, test } from 'bun:test'
import coreEn from '../../../messages/en.json'
import {
  gatedModulePatterns,
  metaFieldLabelKey,
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

/** Every message key a module ships, absolute (namespaced by module id). */
async function absoluteKeys(locale: 'en' | 'zh'): Promise<Set<string>> {
  const perModule = await Promise.all(
    modules.map(async (feature) =>
      flatKeys((await feature.messages[locale]()).default).map(
        (key) => `${feature.id}.${key}`,
      ),
    ),
  )
  return new Set(perModule.flat())
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
        const referenced = [
          sectionTitleKey(section.key),
          sectionDescriptionKey(section.key),
          ...section.metaFields.map((field) =>
            metaFieldLabelKey(section, field),
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
