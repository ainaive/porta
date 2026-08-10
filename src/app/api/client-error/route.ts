import { logger } from '@/lib/logger'

// Sink for client-side error-boundary reports (see lib/client-telemetry.ts):
// re-emits them through the server logger so browser failures reach the same
// stdout the platform captures. Unauthenticated by necessity (a boundary can
// fire before/without a session), so the body is size-capped and only a fixed
// set of fields is logged — never echoed back — to bound log-spam abuse.
export const dynamic = 'force-dynamic'

const MAX_BODY = 8_000

export async function POST(request: Request): Promise<Response> {
  let parsed: Record<string, unknown>
  try {
    const text = await request.text()
    if (text.length > MAX_BODY) return new Response(null, { status: 413 })
    parsed = JSON.parse(text) as Record<string, unknown>
  } catch {
    return new Response(null, { status: 400 })
  }

  logger.error('client error boundary', {
    source: 'client',
    message: parsed.message,
    error: parsed.error,
    name: parsed.name,
    stack: parsed.stack,
    digest: parsed.digest,
  })
  return new Response(null, { status: 204 })
}
