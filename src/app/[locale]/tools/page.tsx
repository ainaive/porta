import { ResourceListing } from '@/components/resource/listing'
import type { Locale } from '@/i18n/routing'

export const dynamic = 'force-dynamic'

export default async function ToolsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>
  searchParams: Promise<{ q?: string; tag?: string }>
}) {
  const [{ locale }, { q, tag }] = await Promise.all([params, searchParams])
  return <ResourceListing type="tool" locale={locale} q={q} tag={tag} />
}
