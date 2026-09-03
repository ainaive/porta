import { ResourceListing } from '@/components/resource/listing'
import { getSection } from '@/core/module/derive'
import type { Locale } from '@/i18n/routing'
import { firstParam, parsePageParam } from '@/lib/utils'
import type { ResourceType } from './meta'

type ListingParams = {
  params: Promise<{ locale: Locale }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

/** Read one facet per declared field out of the query string. A field may
 *  repeat (`?maturity=ga&maturity=beta`), and anything the section did not
 *  declare — or any value its own descriptor does not offer — is dropped
 *  rather than passed to the query: the URL is user input, and a facet is a
 *  closed set by construction. */
function readFacets(
  type: ResourceType,
  searchParams: Record<string, string | string[] | undefined>,
): Record<string, string[]> {
  const section = getSection(type)
  const facets: Record<string, string[]> = {}
  for (const name of section.facets ?? []) {
    const field = section.metaFields.find((f) => f.name === name)
    const allowed = new Set((field?.options ?? []).map((o) => o.value))
    const raw = searchParams[name]
    const values = (Array.isArray(raw) ? raw : raw ? [raw] : []).filter((v) =>
      allowed.has(v),
    )
    if (values.length > 0) facets[name] = values
  }
  return facets
}

// Every section's listing page was the same twenty lines with one word
// changed. A module now names its section and gets search, tag filtering,
// facets and pagination — the point of registering against the shared kernel.
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
        facets={readFacets(type, sp)}
        page={parsePageParam(sp.page)}
      />
    )
  }
}
