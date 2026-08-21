import { describe, expect, test } from 'bun:test'
import { moduleFrameSrc } from '@/core/module/derive'
import { buildCsp, cspHeaderName, newNonce } from './csp'

function directive(policy: string, name: string): string | undefined {
  return policy
    .split('; ')
    .find((part) => part === name || part.startsWith(`${name} `))
}

const NONCE = 'test-nonce'

describe('buildCsp', () => {
  const prod = buildCsp({ nonce: NONCE, isDev: false, isHttps: true })

  test('carries the nonce and strict-dynamic, never unsafe-inline scripts', () => {
    const scriptSrc = directive(prod, 'script-src') ?? ''
    expect(scriptSrc).toContain(`'nonce-${NONCE}'`)
    expect(scriptSrc).toContain("'strict-dynamic'")
    // The whole point of the nonce: 'unsafe-inline' would permit exactly the
    // injected script the policy exists to block.
    expect(scriptSrc).not.toContain("'unsafe-inline'")
  })

  test('allows eval only in development', () => {
    const dev = buildCsp({ nonce: NONCE, isDev: true, isHttps: false })
    expect(directive(dev, 'script-src')).toContain("'unsafe-eval'")
    expect(directive(prod, 'script-src')).not.toContain("'unsafe-eval'")
  })

  // The regression: this used to key on the build mode, so a production
  // container reached over plain http told the browser to upgrade its own
  // /_next/static/* requests to a port with no TLS listener. Every one failed
  // ERR_SSL_PROTOCOL_ERROR and the page came up unstyled and unhydrated.
  // localhost hid it — a potentially trustworthy origin is exempt from the
  // upgrade — so the transport is the only thing that may decide this.
  test('upgrades insecure requests only when the request itself is https', () => {
    for (const isDev of [true, false]) {
      expect(buildCsp({ nonce: NONCE, isDev, isHttps: false })).not.toContain(
        'upgrade-insecure-requests',
      )
      expect(buildCsp({ nonce: NONCE, isDev, isHttps: true })).toContain(
        'upgrade-insecure-requests',
      )
    }
  })

  test('locks down the directives an XSS would otherwise reach for', () => {
    expect(directive(prod, 'default-src')).toBe("default-src 'self'")
    expect(directive(prod, 'object-src')).toBe("object-src 'none'")
    expect(directive(prod, 'base-uri')).toBe("base-uri 'self'")
    expect(directive(prod, 'form-action')).toBe("form-action 'self'")
    expect(directive(prod, 'frame-ancestors')).toBe("frame-ancestors 'none'")
  })

  // The registry is the only place hosts may enter the policy. A module that
  // stops embedding narrows frame-src without anyone editing this file.
  test('takes frame-src from the module manifests', () => {
    const frameSrc = directive(prod, 'frame-src') ?? ''
    expect(frameSrc).toStartWith("frame-src 'self'")
    for (const origin of moduleFrameSrc) {
      expect(frameSrc).toContain(origin)
    }
  })

  test('admits no origin frame-src did not come by honestly', () => {
    const declared = new Set(["'self'", ...moduleFrameSrc])
    const listed = (directive(prod, 'frame-src') ?? '').split(' ').slice(1)
    for (const source of listed) {
      expect(declared).toContain(source)
    }
  })
})

describe('cspHeaderName', () => {
  test('reports rather than enforces when asked', () => {
    expect(cspHeaderName(false)).toBe('Content-Security-Policy')
    expect(cspHeaderName(true)).toBe('Content-Security-Policy-Report-Only')
  })
})

describe('newNonce', () => {
  test('is unguessable and fresh per call', () => {
    const nonces = new Set(Array.from({ length: 100 }, newNonce))
    expect(nonces.size).toBe(100)
    for (const nonce of nonces) expect(nonce.length).toBeGreaterThan(16)
  })
})
