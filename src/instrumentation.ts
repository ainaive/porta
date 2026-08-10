import { type Instrumentation } from 'next'
import { errorFields, logger } from '@/lib/logger'

// Central sink for every server-side error Next surfaces — RSC renders, route
// handlers, and server actions alike (context.routeType says which) — with
// request context attached. This replaces per-action try/catch logging.
// Client-boundary errors arrive separately via /api/client-error (see
// lib/client-telemetry.ts), since those never reach the server otherwise.
export const onRequestError: Instrumentation.onRequestError = (
  error,
  request,
  context,
) => {
  logger.error('server request error', {
    ...errorFields(error),
    method: request.method,
    path: request.path,
    routeType: context.routeType,
    routePath: context.routePath,
    renderSource: context.renderSource,
  })
}
