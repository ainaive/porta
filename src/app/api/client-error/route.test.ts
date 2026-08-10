import { afterEach, describe, expect, mock, spyOn, test } from 'bun:test'
import { POST } from './route'

afterEach(() => {
  mock.restore()
})

function post(body: string, origin: string | null = 'http://localhost:3000') {
  const headers = new Headers({ host: 'localhost:3000' })
  if (origin) headers.set('origin', origin)
  return POST(
    new Request('http://localhost:3000/api/client-error', {
      method: 'POST',
      headers,
      body,
    }),
  )
}

describe('POST /api/client-error', () => {
  test('rejects a cross-origin caller', async () => {
    expect((await post('{}', 'http://evil.example')).status).toBe(403)
  })

  test('rejects a caller with no Origin (non-browser)', async () => {
    expect((await post('{}', null)).status).toBe(403)
  })

  test('rejects non-object JSON payloads', async () => {
    // JSON.parse('null') succeeds, so this must be guarded explicitly.
    expect((await post('null')).status).toBe(400)
    expect((await post('"a string"')).status).toBe(400)
    expect((await post('[1,2]')).status).toBe(400)
    expect((await post('not json at all')).status).toBe(400)
  })

  test('accepts a same-origin object and logs the boundary distinctly', async () => {
    const err = spyOn(console, 'error').mockImplementation(() => {})
    const res = await post('{"boundary":"global","error":"boom"}')

    expect(res.status).toBe(204)
    const logged = JSON.parse(err.mock.calls[0][0] as string)
    // `boundary` survives; `message` stays the logger's own value.
    expect(logged.boundary).toBe('global')
    expect(logged.message).toBe('client error boundary')
  })
})
