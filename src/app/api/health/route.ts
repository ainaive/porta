// Liveness probe: proves the server process is up and serving, independent of
// the database (DB-backed pages are force-dynamic and would conflate "process
// alive" with "DB reachable"). Used by the Docker HEALTHCHECK.
export const dynamic = 'force-dynamic'

export function GET() {
  return Response.json({ status: 'ok' })
}
