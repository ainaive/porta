import { SearchIcon } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { Button } from '@/components/ui/button'
import { navEntries } from '@/core/module/derive'
import { Link } from '@/i18n/navigation'
import { getSession } from '@/lib/session'
import { ActiveNavLink } from './active-nav-link'
import { BrandMark } from './brand-mark'
import { LocaleSwitcher } from './locale-switcher'
import { MobileNav } from './mobile-nav'
import { UserMenu } from './user-menu'

export async function SiteHeader() {
  // Section links come from the module registry; `t` is unnamespaced because
  // each module's labels live under its own namespace.
  const [t, nav, common, search, session] = await Promise.all([
    getTranslations('nav'),
    getTranslations(),
    getTranslations('common'),
    getTranslations('search'),
    getSession(),
  ])

  return (
    // One light canvas, so the bar is opaque: the design separates it from
    // the page with a hairline rule, not a blur.
    <header className="sticky top-0 z-40 border-b bg-background">
      <div className="mx-auto flex w-full max-w-[90rem] items-center gap-5 px-7">
        <MobileNav
          label={t('menu')}
          items={[
            ...navEntries.map((entry) => ({
              href: entry.href,
              label: nav(entry.labelKey),
            })),
            // Search is platform-level, not a module's, so it is appended
            // rather than derived — but it belongs in the phone menu, where
            // the desktop search link is hidden.
            { href: '/search', label: search('title') },
          ]}
        />
        <Link
          href="/"
          className="flex shrink-0 items-baseline gap-2.5 py-[18px]"
        >
          <BrandMark />
          {/* Below sm the mark alone identifies the site: the wordmark plus a
              hamburger, a locale toggle and a sign-in button do not fit a
              390px bar. `sr-only` rather than `hidden` so this link keeps its
              accessible name. */}
          <span className="text-[15.5px] font-bold tracking-[-0.01em] whitespace-nowrap max-sm:sr-only">
            {common('appName')}
          </span>
        </Link>
        {/* Six items and two locales: the row scrolls rather than wrapping,
            which would double the header's height on a narrow laptop. */}
        <nav className="flex min-w-0 flex-1 flex-nowrap overflow-x-auto [scrollbar-width:none] max-sm:hidden">
          {navEntries.map((entry) => (
            <ActiveNavLink key={entry.href} href={entry.href}>
              {nav(entry.labelKey)}
            </ActiveNavLink>
          ))}
        </nav>
        <div className="ml-auto flex shrink-0 items-center gap-3 py-3.5">
          <Button
            asChild
            variant="ghost"
            size="icon-sm"
            className="max-sm:hidden"
          >
            <Link href="/search" aria-label={search('title')}>
              <SearchIcon />
            </Link>
          </Button>
          <LocaleSwitcher />
          {session ? (
            <UserMenu
              name={session.user.name}
              email={session.user.email}
              isAdmin={session.user.role === 'admin'}
              accountLabel={t('account')}
              adminLabel={t('admin')}
              signOutLabel={t('signOut')}
            />
          ) : (
            <Button asChild size="lg" className="px-5">
              <Link href="/sign-in">{t('signIn')}</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}
