import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { requireAdmin } from '@/lib/session'

// Layouts are not a security boundary — every admin page and server action
// calls requireAdmin() itself. This check just fails fast for the whole area.
export default async function AdminLayout({
  children,
}: LayoutProps<'/[locale]/admin'>) {
  await requireAdmin()
  const t = await getTranslations('admin')

  const items = [
    { href: '/admin', label: t('dashboard') },
    { href: '/admin/resources', label: t('resources') },
    { href: '/admin/invites', label: t('invites') },
    { href: '/admin/users', label: t('users') },
  ] as const

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 gap-8 px-4 py-8 max-md:flex-col">
      <aside className="w-44 shrink-0 max-md:w-full">
        <nav className="flex flex-col gap-1 text-sm max-md:flex-row max-md:flex-wrap">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}
