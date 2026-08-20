import { describe, expect, test } from 'bun:test'
import { modelMeta } from './module'

describe('model meta', () => {
  test('defaults links to an empty array', () => {
    const parsed = modelMeta.safeParse({})
    expect(parsed.success).toBe(true)
    expect(parsed.data?.links).toEqual([])
  })

  test('every link needs a label and a URL', () => {
    expect(
      modelMeta.safeParse({ links: [{ label: '', url: 'https://x.test' }] })
        .success,
    ).toBe(false)
    expect(
      modelMeta.safeParse({ links: [{ label: 'Docs', url: 'nope' }] }).success,
    ).toBe(false)
  })

  test('rejects a non-URL docsUrl', () => {
    expect(modelMeta.safeParse({ docsUrl: 'nope' }).success).toBe(false)
  })
})
