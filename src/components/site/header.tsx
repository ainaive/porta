import { getTranslations } from 'next-intl/server'
import { Button } from '@/components/ui/button'
import { Link } from '@/i18n/navigation'
import { getSession } from '@/lib/session'
import { BrandMark } from './brand-mark'
import { LocaleSwitcher } from './locale-switcher'
import { MobileNav } from './mobile-nav'
import { UserMenu } from './user-menu'

const SECTIONS = [
  { href: '/tools', key: 'tools' },
  { href: '/courses', key: 'courses' },
  { href: '/videos', key: 'videos' },
  { href: '/models', key: 'models' },
] as const

export async function SiteHeader() {
  const [t, common, session] = await Promise.all([
    getTranslations('nav'),
    getTranslations('common'),
    getSession(),
  ])

  return (
    // Styled entirely from tokens so the same bar reads correctly on the light
    // app and inside the landing page's dark scope (see ChromeShell).
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-xl supports-backdrop-filter:bg-background/65">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-4 px-4">
        <MobileNav
          label={t('menu')}
          items={SECTIONS.map((section) => ({
            href: section.href,
            label: t(section.key),
          }))}
        />
        <Link href="/" className="flex items-center gap-2.5">
          <BrandMark />
          {/* Below sm the mark alone identifies the site: the wordmark plus a
              hamburger, a locale toggle and a sign-in button do not fit a
              390px bar. `sr-only` rather than `hidden` so this link keeps its
              accessible name. */}
          <span className="font-display text-[17px] font-extrabold tracking-[-0.03em] max-sm:sr-only">
            {common('appName')}
          </span>
        </Link>
        <nav className="flex items-center gap-1 text-sm max-sm:hidden">
          {SECTIONS.map((section) => (
            <Link
              key={section.key}
              href={section.href}
              className="rounded-md px-3 py-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              {t(section.key)}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <LocaleSwitcher />
          {session ? (
            <UserMenu
              name={session.user.name}
              email={session.user.email}
              isAdmin={session.user.role === 'admin'}
              adminLabel={t('admin')}
              signOutLabel={t('signOut')}
            />
          ) : (
            <Button asChild size="lg" className="px-4">
              <Link href="/sign-in">{t('signIn')}</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}
