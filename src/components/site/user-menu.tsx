'use client'

import { useLocale } from 'next-intl'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Link } from '@/i18n/navigation'
import { authClient } from '@/lib/auth-client'

export function UserMenu({
  name,
  email,
  isAdmin,
  adminLabel,
  signOutLabel,
}: {
  name: string
  email: string
  isAdmin: boolean
  adminLabel: string
  signOutLabel: string
}) {
  const locale = useLocale()

  async function handleSignOut() {
    await authClient.signOut()
    // Full navigation so gated pages re-run their server-side session checks.
    window.location.assign(`/${locale}`)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full">
          <Avatar className="size-8">
            <AvatarFallback>{name.slice(0, 1).toUpperCase()}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>
          <div className="font-medium">{name}</div>
          <div className="text-xs font-normal text-muted-foreground">
            {email}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {isAdmin ? (
          <DropdownMenuItem asChild>
            <Link href="/admin">{adminLabel}</Link>
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem onSelect={handleSignOut}>
          {signOutLabel}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
