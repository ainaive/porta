import { cn } from '@/lib/utils'

// Styled native <select> — admin forms don't need the full Radix select.
export function NativeSelect({
  className,
  ...props
}: React.ComponentProps<'select'>) {
  return (
    <select
      className={cn(
        'border-input h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring dark:bg-input/30',
        className,
      )}
      {...props}
    />
  )
}
