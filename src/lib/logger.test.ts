import { afterEach, describe, expect, mock, spyOn, test } from 'bun:test'
import { errorFields, logger } from './logger'

afterEach(() => {
  mock.restore()
})

describe('logger', () => {
  test('emits one JSON line with level, message, and a timestamp', () => {
    const err = spyOn(console, 'error').mockImplementation(() => {})
    logger.error('boom', { requestId: 'r1' })

    expect(err).toHaveBeenCalledTimes(1)
    const parsed = JSON.parse(err.mock.calls[0][0] as string)
    expect(parsed).toMatchObject({
      level: 'error',
      message: 'boom',
      requestId: 'r1',
    })
    expect(typeof parsed.time).toBe('string')
  })

  test('context cannot override the required fields', () => {
    const err = spyOn(console, 'error').mockImplementation(() => {})
    logger.error('real', { level: 'debug', message: 'fake', time: 'nope' })

    const parsed = JSON.parse(err.mock.calls[0][0] as string)
    expect(parsed.level).toBe('error')
    expect(parsed.message).toBe('real')
    expect(parsed.time).not.toBe('nope')
  })

  test('routes warn/error to stderr and info/debug to stdout', () => {
    const err = spyOn(console, 'error').mockImplementation(() => {})
    const out = spyOn(console, 'log').mockImplementation(() => {})

    logger.warn('w')
    logger.info('i')

    expect(err).toHaveBeenCalledTimes(1)
    expect(out).toHaveBeenCalledTimes(1)
  })
})

describe('errorFields', () => {
  test('extracts message, name, and stack from an Error', () => {
    const fields = errorFields(new TypeError('nope'))
    expect(fields).toMatchObject({ error: 'nope', name: 'TypeError' })
    expect(typeof fields.stack).toBe('string')
  })

  test('stringifies a non-Error throw', () => {
    expect(errorFields('raw string')).toEqual({ error: 'raw string' })
  })
})
