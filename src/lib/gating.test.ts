import { describe, expect, test } from 'bun:test'
import { isGatedPath, splitLocale } from './gating'

describe('splitLocale', () => {
  test('strips a known locale prefix', () => {
    expect(splitLocale('/zh/tools/x')).toEqual({
      locale: 'zh',
      bare: '/tools/x',
    })
  })

  test('defaults locale for unprefixed paths', () => {
    expect(splitLocale('/tools/x')).toEqual({ locale: 'en', bare: '/tools/x' })
  })
})

describe('isGatedPath', () => {
  test.each([
    '/en/tools/silicon-cli',
    '/zh/courses/some-course/2',
    '/videos/clip',
    '/en/admin',
    '/zh/admin/',
    '/admin/resources/abc',
  ])('gates %s', (path) => {
    expect(isGatedPath(path)).toBe(true)
  })

  test.each([
    '/en/tools',
    '/zh/courses',
    '/en',
    '/',
    '/en/sign-in',
    '/zh/sign-up',
    '/en/administrator',
  ])('leaves %s public', (path) => {
    expect(isGatedPath(path)).toBe(false)
  })
})
