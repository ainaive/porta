import { type Instrumentation } from 'next'
import { errorFields, logger } from '@/lib/logger'

// React may replace the thrown value during RSC rendering, but the digest is
// preserved and is what correlates this entry with the client boundary report.
function digestOf(error: unknown): string | undefined {
  return typeof error === 'object' && error !== null && 'digest' in error
    ? String((error as { digest?: unknown }).digest)
    : undefined
}

// Central sink for every server-side error Next surfaces — RSC renders, route
// handlers, and server actions alike (context.routeType says which) — with
// request context attached. This replaces per-action try/catch logging.
// Client-boundary errors are out of scope here (they log to the browser
// console for local dev); server-side capture of those belongs to a proper
// error tracker if added later.
export const onRequestError: Instrumentation.onRequestError = (
  error,
  request,
  context,
) => {
  logger.error('server request error', {
    ...errorFields(error),
    digest: digestOf(error),
    method: request.method,
    // Pathname only: request.path carries the query string, which can hold an
    // invite token. routePath is the matched (value-free) template.
    path: request.path.split('?')[0],
    routeType: context.routeType,
    routePath: context.routePath,
    renderSource: context.renderSource,
  })
}
