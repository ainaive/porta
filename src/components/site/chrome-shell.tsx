'use client'

import type { ReactNode } from 'react'
import { usePathname } from '@/i18n/navigation'
import { cn } from '@/lib/utils'

// The landing page is the one dark surface in an otherwise light app, and the
// header and footer around it are rendered by the shared layout — which cannot
// see the route. This reads it instead and opens the `.landing` token scope
// around the whole tree, so the chrome darkens with the page rather than
// sitting on top of it in light grey.
//
// usePathname comes from @/i18n/navigation, so it is already locale-stripped
// ('/' for both /en and /zh) and resolves during SSR — no hydration flip.
// Children stay server components; they only pass through.
export function ChromeShell({ children }: { children: ReactNode }) {
  const isLanding = usePathname() === '/'

  return (
    <div
      className={cn(
        'flex flex-1 flex-col bg-background text-foreground',
        // `font-sans` re-resolves the family list against this element, which
        // is where .landing swaps it; inheriting from <html> would not.
        isLanding && 'landing dark font-sans',
      )}
    >
      {children}
    </div>
  )
}
