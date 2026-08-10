// Best-effort ship of a client-side error to the server so it lands in the
// same structured stdout logs as server errors — a browser console.error
// alone never reaches Vercel/container stderr. Fire-and-forget: it must never
// throw or block the error boundary that calls it.
export function reportClientError(payload: Record<string, unknown>): void {
  try {
    void fetch('/api/client-error', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {})
  } catch {
    // A synchronous fetch throw (e.g. during teardown) must not surface.
  }
}
