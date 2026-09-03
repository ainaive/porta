'use client'

import type { ReactNode } from 'react'
import { Link, usePathname } from '@/i18n/navigation'
import { cn } from '@/lib/utils'

/** A header nav item that marks itself current. The design distinguishes the
 *  active section with a rust underline and a weight change rather than a
 *  filled pill, and that needs the pathname — the only reason this is a
 *  client component in an otherwise server-rendered header.
 *
 *  `usePathname` from `@/i18n/navigation` is locale-stripped, so this compares
 *  bare paths and never has to know which locale it is in. */
export function ActiveNavLink({
  href,
  children,
}: {
  href: string
  children: ReactNode
}) {
  const pathname = usePathname()
  // The overview is only current at the root; every other entry owns its
  // subtree, so /tools/silicon-cli still marks "Tool catalog".
  const active =
    href === '/'
      ? pathname === '/'
      : pathname === href || pathname.startsWith(`${href}/`)

  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'border-b-2 px-2.5 pt-[19px] pb-[17px] text-[13.5px] whitespace-nowrap transition-colors',
        active
          ? 'border-brand font-semibold text-foreground'
          : 'border-transparent text-muted-foreground hover:text-foreground',
      )}
    >
      {children}
    </Link>
  )
}
