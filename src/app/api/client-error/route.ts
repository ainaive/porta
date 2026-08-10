import { logger } from '@/lib/logger'

// Sink for client-side error-boundary reports (see lib/client-telemetry.ts):
// re-emits them through the server logger so browser failures reach the same
// stdout the platform captures. Necessarily unauthenticated (a boundary can
// fire before/without a session), so it is defended in depth: same-origin
// only, a per-instance rate cap, an early size limit, and strict shape
// validation — a fixed, non-echoed field set is logged.
export const dynamic = 'force-dynamic'

const MAX_BODY = 8_000
const WINDOW_MS = 60_000
const MAX_PER_WINDOW = 60

let windowStart = 0
let windowCount = 0

function overRateLimit(now: number): boolean {
  if (now - windowStart > WINDOW_MS) {
    windowStart = now
    windowCount = 0
  }
  windowCount += 1
  return windowCount > MAX_PER_WINDOW
}

// The boundaries fetch from the app itself, so the Origin host must equal the
// serving host; a cross-site or non-browser caller (no Origin) is turned away.
function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin')
  if (!origin) return false
  try {
    return new URL(origin).host === request.headers.get('host')
  } catch {
    return false
  }
}

export async function POST(request: Request): Promise<Response> {
  if (!isSameOrigin(request)) return new Response(null, { status: 403 })
  if (overRateLimit(Date.now())) return new Response(null, { status: 429 })

  // Reject oversized bodies by their declared length before buffering.
  const declared = Number(request.headers.get('content-length'))
  if (Number.isFinite(declared) && declared > MAX_BODY) {
    return new Response(null, { status: 413 })
  }

  let parsed: unknown
  try {
    const text = await request.text()
    if (text.length > MAX_BODY) return new Response(null, { status: 413 })
    parsed = JSON.parse(text)
  } catch {
    return new Response(null, { status: 400 })
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return new Response(null, { status: 400 })
  }

  const body = parsed as Record<string, unknown>
  logger.error('client error boundary', {
    source: 'client',
    // `boundary` (route|global), not `message`: the logger reserves `message`
    // for its own value, so reusing it would erase which boundary reported.
    boundary: body.boundary,
    error: body.error,
    name: body.name,
    stack: body.stack,
    digest: body.digest,
  })
  return new Response(null, { status: 204 })
}
