import { describe, expect, test } from 'bun:test'
import { diffMessageKeys, messageBundles } from './check-messages'

describe('diffMessageKeys', () => {
  test('reports nested keys missing in either direction', () => {
    const a = { nav: { home: 'Home', about: 'About' }, title: 'T' }
    const b = { nav: { home: '首页' }, extra: 'x' }
    const diff = diffMessageKeys(a, b)
    expect(diff.missingInB).toEqual(['nav.about', 'title'])
    expect(diff.missingInA).toEqual(['extra'])
  })

  test('identical objects diff empty', () => {
    const a = { x: { y: '1' } }
    expect(diffMessageKeys(a, { x: { y: 'other' } })).toEqual({
      missingInB: [],
      missingInA: [],
    })
  })
})

test('every bundle has en/zh parity', async () => {
  const bundles = await messageBundles()
  // Core plus one per module — a bundle that never loaded would pass an
  // emptiness check silently, so assert the count grew with the registry.
  expect(bundles.length).toBeGreaterThan(1)
  for (const bundle of bundles) {
    expect({ [bundle.name]: diffMessageKeys(bundle.en, bundle.zh) }).toEqual({
      [bundle.name]: { missingInB: [], missingInA: [] },
    })
  }
})
