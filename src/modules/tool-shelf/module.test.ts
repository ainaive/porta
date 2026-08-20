import { describe, expect, test } from 'bun:test'
import { toolMeta } from './module'

describe('tool meta', () => {
  test('rejects non-URL fields', () => {
    expect(toolMeta.safeParse({ url: 'not-a-url' }).success).toBe(false)
    expect(toolMeta.safeParse({}).success).toBe(true)
  })

  test('accepts both links', () => {
    const parsed = toolMeta.safeParse({
      url: 'https://example.com',
      docsUrl: 'https://example.com/docs',
    })
    expect(parsed.success).toBe(true)
  })
})
