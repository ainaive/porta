import { ResourceListing } from '@/components/resource/listing'
import type { Locale } from '@/i18n/routing'
import { firstParam, parsePageParam } from '@/lib/utils'

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
  const page = parsePageParam(sp.page)
  return (
    <ResourceListing type="tool" locale={locale} q={q} tag={tag} page={page} />
  )
}
