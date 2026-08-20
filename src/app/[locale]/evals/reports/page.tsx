// Route mount: the page itself belongs to the module that owns this section.
// `dynamic` is declared here rather than re-exported because route segment
// config is read from the route file (ADR 0013, ADR 0005 — no DB at build).
export { default } from '@/modules/ai-eval/pages/report-listing'

export const dynamic = 'force-dynamic'
