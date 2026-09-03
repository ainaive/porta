import { getTranslations } from 'next-intl/server'
import type { TranslatedResource } from '@/core/content/queries'
import { findSection, metaFieldOptionLabelKey } from '@/core/module/derive'
import { cn } from '@/lib/utils'

const TONE: Record<string, string> = {
  ga: 'border-status-ga-border bg-status-ga-bg text-status-ga',
  beta: 'border-status-beta-border bg-status-beta-bg text-status-beta',
  deprecated:
    'border-status-retired-border bg-status-retired-bg text-status-retired',
}

/** A tool's maturity, rendered as the design's bordered status pill.
 *
 *  Reads `meta.maturity` through the section's own descriptor, so the label
 *  translates and an unrecognised value renders nothing rather than a raw
 *  enum. Sections with no maturity field simply have no badge. */
export async function StatusBadge({
  resource,
  className,
}: {
  resource: TranslatedResource
  className?: string
}) {
  const section = findSection(resource.type)
  const field = section?.metaFields.find((f) => f.name === 'maturity')
  if (!section || !field) return null

  const value = (resource.meta as Record<string, unknown>)?.maturity
  if (typeof value !== 'string') return null
  const option = field.options?.find((o) => o.value === value)
  if (!option) return null

  const label = await getTranslations()
  const key = metaFieldOptionLabelKey(section, option)

  return (
    <span
      className={cn(
        'border px-2 py-0.5 font-mono text-[10.5px] tracking-[0.05em]',
        TONE[value] ?? TONE.deprecated,
        className,
      )}
    >
      {key ? label(key) : option.label}
    </span>
  )
}
