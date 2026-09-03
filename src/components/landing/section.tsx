import type { ReactNode } from 'react'
import { Link } from '@/i18n/navigation'
import { cn } from '@/lib/utils'

/** One band of the overview, separated from the next by a hairline rule
 *  rather than by whitespace or a colour change. */
export function LandingSection({
  className,
  children,
}: {
  className?: string
  children: ReactNode
}) {
  return (
    <section className={cn('border-b px-7 py-13 sm:px-12', className)}>
      <div className="mx-auto w-full max-w-[80rem]">{children}</div>
    </section>
  )
}

/** The design's recurring band header: a small uppercase mono heading with an
 *  optional "All … →" link opposite it. A real `h2`, so the page still reads
 *  as an outline. */
export function BandHeading({
  children,
  moreHref,
  moreLabel,
}: {
  children: ReactNode
  moreHref?: string
  moreLabel?: string
}) {
  return (
    <div className="mb-6 flex flex-wrap items-baseline justify-between gap-3">
      <h2 className="font-mono text-[13px] font-semibold tracking-[0.1em] text-label uppercase">
        {children}
      </h2>
      {moreHref && moreLabel ? (
        <Link
          href={moreHref}
          className="text-[13px] text-brand hover:underline"
        >
          {moreLabel} →
        </Link>
      ) : null}
    </div>
  )
}
