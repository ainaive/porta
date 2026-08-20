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
    <footer className="mt-auto border-t">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-6 text-sm">
        <div className="flex items-center gap-2.5">
          <BrandMark className="size-5" />
          <span className="font-mono text-xs text-muted-foreground">
            © {new Date().getFullYear()} {common('appName')}
          </span>
        </div>
        <nav className="ml-auto flex flex-wrap items-center gap-x-5 gap-y-2">
          {navEntries.map((entry) => (
            <Link
              key={entry.href}
              href={entry.href}
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              {nav(entry.labelKey)}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  )
}
