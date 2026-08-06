import { describe, expect, test } from 'bun:test'
import en from '../messages/en.json'
import zh from '../messages/zh.json'
import { diffMessageKeys } from './check-messages'

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

test('en.json and zh.json are in sync', () => {
  expect(diffMessageKeys(en, zh)).toEqual({ missingInB: [], missingInA: [] })
})
