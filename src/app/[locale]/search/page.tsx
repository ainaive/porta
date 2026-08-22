import type { Metadata } from 'next'
import { ResourceSearch } from '@/components/resource/search'
import type { ResourceType } from '@/core/content/meta'
import { isSectionKey } from '@/core/module/derive'
import type { Locale } from '@/i18n/routing'
import { firstParam, parsePageParam } from '@/lib/utils'

export const dynamic = 'force-dynamic'

// Public — results carry title and summary, which is exactly what a section
// listing already shows a signed-out visitor — but never indexed. A query
// string is an unbounded URL space, so one crawled search link leads to
// endlessly many more. robots.txt disallows the path (src/lib/gating.ts);
// this is the per-page half of the same decision (ADR 0016). `follow` stays
// on so the links out of a result page still count.
export const metadata: Metadata = {
  robots: { index: false, follow: true },
}

export default async function SearchPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>
  searchParams: Promise<{
    q?: string | string[]
    type?: string | string[]
    page?: string | string[]
  }>
}) {
  const [{ locale }, sp] = await Promise.all([params, searchParams])
  // An unknown ?type= is dropped rather than 404ing: a stale filter link is a
  // reason to search everything, not to refuse to search.
  const requested = firstParam(sp.type)
  const type: ResourceType | undefined =
    requested && isSectionKey(requested) ? requested : undefined

  return (
    <ResourceSearch
      locale={locale}
      q={firstParam(sp.q)}
      type={type}
      page={parsePageParam(sp.page)}
    />
  )
}
