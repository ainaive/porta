import { getTranslations } from 'next-intl/server'
import { Button } from '@/components/ui/button'
import { Link } from '@/i18n/navigation'
import { getSession } from '@/lib/session'
import { LocaleSwitcher } from './locale-switcher'
import { UserMenu } from './user-menu'

const SECTIONS = [
  { href: '/tools', key: 'tools' },
  { href: '/courses', key: 'courses' },
  { href: '/videos', key: 'videos' },
  { href: '/models', key: 'models' },
] as const

export async function SiteHeader() {
  const [t, session] = await Promise.all([getTranslations('nav'), getSession()])

  return (
    <header className="border-b">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-4 px-4">
        <Link href="/" className="font-semibold tracking-tight">
          Porta
        </Link>
        <nav className="flex items-center gap-1 text-sm max-sm:hidden">
          {SECTIONS.map((section) => (
            <Link
              key={section.key}
              href={section.href}
              className="rounded-md px-3 py-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
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
            <Button asChild size="sm" variant="outline">
              <Link href="/sign-in">{t('signIn')}</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}
