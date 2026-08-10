import { ResourceListing } from '@/components/resource/listing'
import type { Locale } from '@/i18n/routing'
import { firstParam } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function ToolsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>
  searchParams: Promise<{
    q?: string | string[]
    tag?: string | string[]
    page?: string | string[]
  }>
}) {
  const [{ locale }, sp] = await Promise.all([params, searchParams])
  const q = firstParam(sp.q)
  const tag = firstParam(sp.tag)
  const parsedPage = Number.parseInt(firstParam(sp.page) ?? '', 10)
  const page = Number.isNaN(parsedPage) ? undefined : parsedPage
  return (
    <ResourceListing type="tool" locale={locale} q={q} tag={tag} page={page} />
  )
}
