import { cn } from '@/lib/utils'

/** The wordmark's square. Solid rust, no glow and no inner cut — the design
 *  reduced the mark to a single filled block, which is the whole reason it
 *  still reads at 13px next to the wordmark's baseline. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn('inline-block size-[13px] shrink-0 bg-brand', className)}
    />
  )
}
