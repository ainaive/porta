import Link from 'next/link'

// The 404 for paths that never reach the locale tree. The proxy matcher
// excludes /api, /_next, /_vercel and anything containing a dot, so an
// unprefixed page path is redirected to a locale and answered by
// [locale]/not-found.tsx — what lands here is the rest: /apple-touch-icon.png,
// /ads.txt, an unknown /api/* route. Crawlers and link checkers ask for those
// routinely, and Next's built-in fallback is an unstyled black-on-white line.
//
// There is no root layout above this (the locale layout renders <html>), so
// like global-error.tsx it ships its own document and cannot use the app's
// CSS, fonts or i18n providers — hence inline styles and English copy. The
// way out points at the default locale rather than '/' because every URL
// carries its locale (ADR 0004), and it uses plain next/link, not the
// locale-aware wrapper, which needs the i18n provider this page is above.
export default function RootNotFound() {
  return (
    <html lang="en">
      <body
        style={{
          fontFamily: 'system-ui, sans-serif',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1rem',
          textAlign: 'center',
          padding: '4rem 1rem',
        }}
      >
        <p style={{ fontSize: '3rem', fontWeight: 600, color: '#9ca3af' }}>
          404
        </p>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Page not found</h1>
        <p style={{ color: '#6b7280', maxWidth: '28rem' }}>
          This address does not exist.
        </p>
        <Link
          href="/en"
          style={{
            marginTop: '0.5rem',
            padding: '0.5rem 1rem',
            borderRadius: '0.5rem',
            border: '1px solid #d1d5db',
            color: 'inherit',
            textDecoration: 'none',
          }}
        >
          Go to the portal
        </Link>
      </body>
    </html>
  )
}
