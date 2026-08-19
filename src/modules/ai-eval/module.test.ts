import { describe, expect, test } from 'bun:test'
import { modelApiMeta } from './module'

describe('model API meta', () => {
  test('defaults links to an empty array', () => {
    const parsed = modelApiMeta.safeParse({})
    expect(parsed.success).toBe(true)
    expect(parsed.data?.links).toEqual([])
  })

  test('every link needs a label and a URL', () => {
    expect(
      modelApiMeta.safeParse({ links: [{ label: '', url: 'https://x.test' }] })
        .success,
    ).toBe(false)
    expect(
      modelApiMeta.safeParse({ links: [{ label: 'Docs', url: 'nope' }] })
        .success,
    ).toBe(false)
  })

  test('rejects a non-URL docsUrl', () => {
    expect(modelApiMeta.safeParse({ docsUrl: 'nope' }).success).toBe(false)
  })
})
