import { cn } from '@/lib/utils'

// Decorative: the wordmark next to it carries the accessible name.
export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'grid size-6 shrink-0 place-items-center rounded-md bg-brand shadow-[0_0_18px] shadow-brand/50',
        className,
      )}
    >
      <span className="size-2 rounded-[2px] bg-[var(--landing-background)]" />
    </span>
  )
}
