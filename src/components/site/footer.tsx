import { getTranslations } from 'next-intl/server'
import { navEntries } from '@/core/module/derive'
import { Link } from '@/i18n/navigation'
import { BrandMark } from './brand-mark'

export async function SiteFooter() {
  // Same registry-derived list as the header, so the two can no longer drift.
  const [nav, common] = await Promise.all([
    getTranslations(),
    getTranslations('common'),
  ])

  return (
    <footer className="mt-auto border-t bg-panel">
      <div className="mx-auto flex w-full max-w-[90rem] flex-wrap items-center gap-x-7 gap-y-3 px-7 py-7 text-[13px]">
        <div className="flex items-baseline gap-2.5">
          <BrandMark />
          <span className="font-mono text-[11px] tracking-[0.04em] text-label">
            © {new Date().getFullYear()} {common('appName')}
          </span>
        </div>
        <nav className="ml-auto flex flex-wrap items-center gap-x-5 gap-y-2">
          {navEntries.map((entry) => (
            <Link
              key={entry.href}
              href={entry.href}
              className="text-muted-foreground transition-colors hover:text-brand"
            >
              {nav(entry.labelKey)}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  )
}
