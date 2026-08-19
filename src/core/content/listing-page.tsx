import { ResourceListing } from '@/components/resource/listing'
import type { Locale } from '@/i18n/routing'
import { firstParam, parsePageParam } from '@/lib/utils'
import type { ResourceType } from './meta'

type ListingParams = {
  params: Promise<{ locale: Locale }>
  searchParams: Promise<{
    q?: string | string[]
    tag?: string | string[]
    page?: string | string[]
  }>
}

// Every section's listing page was the same twenty lines with one word
// changed. A module now names its section and gets search, tag filtering and
// pagination — the point of registering against the shared kernel.
export function createListingPage(type: ResourceType) {
  return async function SectionListingPage({
    params,
    searchParams,
  }: ListingParams) {
    const [{ locale }, sp] = await Promise.all([params, searchParams])
    return (
      <ResourceListing
        type={type}
        locale={locale}
        q={firstParam(sp.q)}
        tag={firstParam(sp.tag)}
        page={parsePageParam(sp.page)}
      />
    )
  }
}
