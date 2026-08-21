import { describe, expect, test } from 'bun:test'
import { securityHeaders } from './security-headers'

describe('securityHeaders', () => {
  const rules = securityHeaders()

  test('applies the baseline set to every path', () => {
    const baseline = rules.find((rule) => !('has' in rule && rule.has))
    expect(baseline).toBeDefined()
    expect(baseline?.source).toBe('/(.*)')

    const keys = baseline?.headers.map((header) => header.key) ?? []
    expect(keys).toEqual([
      'X-Content-Type-Options',
      'Referrer-Policy',
      'X-Frame-Options',
      'Permissions-Policy',
      'Cross-Origin-Opener-Policy',
    ])
  })

  // The regression that matters: HSTS pinned on http://localhost would lock a
  // developer (or a bare container) out of the site for the max-age.
  test('sends HSTS only when the request arrived over https', () => {
    const hsts = rules.filter((rule) =>
      rule.headers.some((header) => header.key === 'Strict-Transport-Security'),
    )
    expect(hsts).toHaveLength(1)
    expect(hsts[0]?.has).toEqual([
      { type: 'header', key: 'x-forwarded-proto', value: 'https' },
    ])
  })

  test('no rule sends CSP — that is the proxy, which owns the nonce', () => {
    for (const rule of rules) {
      for (const header of rule.headers) {
        expect(header.key.toLowerCase()).not.toContain(
          'content-security-policy',
        )
      }
    }
  })
})
