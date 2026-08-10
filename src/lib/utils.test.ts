import { describe, expect, test } from 'bun:test'
import { firstParam, firstValueQuery } from './utils'

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
