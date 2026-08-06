import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { BrandMark } from './brand-mark'

const SECTIONS = ['tools', 'courses', 'videos', 'models'] as const

const SECTION_HREF = {
  tools: '/tools',
  courses: '/courses',
  videos: '/videos',
  models: '/models',
} as const

export async function SiteFooter() {
  const [t, common] = await Promise.all([
    getTranslations('nav'),
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
          {SECTIONS.map((key) => (
            <Link
              key={key}
              href={SECTION_HREF[key]}
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              {t(key)}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  )
}
