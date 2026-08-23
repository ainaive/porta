import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { ResourceListing } from '@/components/resource/listing'
import {
  sectionDescriptionKey,
  sectionPath,
  sectionTitleKey,
} from '@/core/module/derive'
import type { Locale } from '@/i18n/routing'
import { pageMetadata } from '@/lib/metadata'
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

// The listing pages are the crawlable half of the public surface — they are
// exactly what sitemap.ts advertises — so each one has to say what it is.
// Derived from the same registry entry that names the section in the nav and
// heads its page, so a new section arrives with its own title and description
// instead of inheriting the landing's (ADR 0013, and the tile split in 0015).
export function createListingMetadata(type: ResourceType) {
  return async function generateMetadata({
    params,
  }: {
    params: Promise<{ locale: Locale }>
  }): Promise<Metadata> {
    const { locale } = await params
    const t = await getTranslations({ locale })
    const title = t(sectionTitleKey(type))
    return {
      title,
      ...pageMetadata({
        title,
        description: t(sectionDescriptionKey(type)),
        siteName: t('common.appName'),
        path: sectionPath(type),
        locale,
      }),
    }
  }
}
