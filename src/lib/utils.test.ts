import { describe, expect, test } from 'bun:test'
import { firstParam, firstValueQuery, parsePageParam } from './utils'

describe('firstParam', () => {
  test('returns the first element of an array, else the value', () => {
    expect(firstParam(['a', 'b'])).toBe('a')
    expect(firstParam('a')).toBe('a')
    expect(firstParam(undefined)).toBeUndefined()
    expect(firstParam([])).toBeUndefined()
  })
})

describe('firstValueQuery', () => {
  test('keeps the first value of duplicate keys', () => {
    expect(firstValueQuery(new URLSearchParams('q=a&q=b&tag=x'))).toEqual({
      q: 'a',
      tag: 'x',
    })
  })

  test('is empty for no params', () => {
    expect(firstValueQuery(new URLSearchParams(''))).toEqual({})
  })
})

describe('parsePageParam', () => {
  test('accepts a plain positive integer (first value)', () => {
    expect(parsePageParam('3')).toBe(3)
    expect(parsePageParam(['2', '9'])).toBe(2)
  })

  test('rejects junk, zero, negatives, and overlong input', () => {
    for (const bad of [
      undefined,
      '',
      '0',
      '-1',
      '2junk',
      'abc',
      '1'.repeat(400), // parseInt would overflow to a non-safe integer
    ]) {
      expect(parsePageParam(bad)).toBeUndefined()
    }
  })
})
