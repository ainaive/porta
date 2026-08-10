'use client'

import { useEffect } from 'react'
import { errorFields, logger } from '@/lib/logger'

// Last-resort boundary for throws in the locale layout itself (which renders
// <html>/<body>) or anywhere above the route segments. It replaces the whole
// document, so it must ship its own <html>/<body> and can't rely on the app's
// CSS, fonts, or i18n providers — hence inline styles and English copy.
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string }
  // retry() re-fetches the failed tree; reset() only clears state, which for
  // a root-layout/server error would rethrow immediately.
  retry: () => void
}) {
  useEffect(() => {
    logger.error('global error boundary', {
      ...errorFields(error),
      digest: error.digest,
    })
  }, [error])

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
        <h1 style={{ fontSize: '1.25rem', fontWeight: 600 }}>
          Something went wrong
        </h1>
        <p style={{ color: '#6b7280', maxWidth: '28rem' }}>
          An unexpected error occurred. Please try again.
        </p>
        <button
          type="button"
          onClick={() => retry()}
          style={{
            padding: '0.5rem 1rem',
            borderRadius: '0.5rem',
            border: '1px solid #d1d5db',
            cursor: 'pointer',
          }}
        >
          Try again
        </button>
      </body>
    </html>
  )
}
