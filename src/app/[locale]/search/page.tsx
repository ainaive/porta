import type { Metadata } from 'next'
import { ResourceSearch } from '@/components/resource/search'
import type { ResourceType } from '@/core/content/meta'
import { isSectionKey } from '@/core/module/derive'
import type { Locale } from '@/i18n/routing'
import { firstParam, parsePageParam } from '@/lib/utils'

export const dynamic = 'force-dynamic'

// Public — results carry title and summary, which is exactly what a section
// listing already shows a signed-out visitor — but never indexed: a search
// result page is not a page anyone should arrive on from Google.
//
// This tag is the whole mechanism, and it only works if crawlers may fetch
// the page. robots.txt deliberately does NOT disallow /search: a blocked URL
// is never fetched, so this line would never be read, and the header links to
// /search from every page — Google would index the bare URL on link evidence
// alone and show it with no snippet. `follow` stays on so the links out of a
// result page still count (ADR 0016).
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
