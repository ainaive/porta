import { ResourceListing } from '@/components/resource/listing'
import type { Locale } from '@/i18n/routing'
import { firstParam } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function VideosPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>
  searchParams: Promise<{ q?: string | string[]; tag?: string | string[] }>
}) {
  const [{ locale }, sp] = await Promise.all([params, searchParams])
  const q = firstParam(sp.q)
  const tag = firstParam(sp.tag)
  return <ResourceListing type="video" locale={locale} q={q} tag={tag} />
}
