import { describe, expect, test } from 'bun:test'
import { safeNextPath } from './safe-redirect'

const ORIGIN = 'https://app.example'
const FALLBACK = '/en'

describe('safeNextPath', () => {
  test('keeps a same-origin path with its query and hash', () => {
    expect(safeNextPath('/en/tools?q=agent#top', ORIGIN, FALLBACK)).toBe(
      '/en/tools?q=agent#top',
    )
  })

  test('normalizes an absolute same-origin URL to its path', () => {
    expect(safeNextPath('https://app.example/en/x?a=1', ORIGIN, FALLBACK)).toBe(
      '/en/x?a=1',
    )
  })

  test('falls back for empty input', () => {
    expect(safeNextPath(null, ORIGIN, FALLBACK)).toBe(FALLBACK)
    expect(safeNextPath(undefined, ORIGIN, FALLBACK)).toBe(FALLBACK)
    expect(safeNextPath('', ORIGIN, FALLBACK)).toBe(FALLBACK)
  })

  test('rejects off-origin and protocol-relative / control-char evasions', () => {
    for (const evil of [
      '//evil.com',
      '/\\evil.com', // backslash → protocol-relative
      '/\t\\evil.com', // tab is stripped, then \ → protocol-relative
      '/\n\\evil.com', // newline is stripped too
      'https://evil.com/x',
      'javascript:alert(1)',
    ]) {
      expect(safeNextPath(evil, ORIGIN, FALLBACK)).toBe(FALLBACK)
    }
  })
})
