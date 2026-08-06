import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

// Ambient radial wash behind a section. Purely decorative — positioned by the
// caller, and always hidden from assistive tech.
export function Glow({
  className,
  color,
}: {
  className?: string
  color: string
}) {
  return (
    <div
      aria-hidden
      className={cn('pointer-events-none absolute', className)}
      style={{
        background: `radial-gradient(ellipse at center, ${color}, transparent 65%)`,
      }}
    />
  )
}

// Mono eyebrow above a heading. `uppercase` is a no-op on Chinese, which is
// why the label is a translated word rather than a baked-in English string.
export function Kicker({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'font-mono text-[11px] tracking-[0.12em] text-brand uppercase',
        className,
      )}
    >
      {children}
    </div>
  )
}
