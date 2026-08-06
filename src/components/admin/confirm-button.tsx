'use client'

import { useEffect, useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'

// Two-click destructive button: first click arms it, second click within 4s
// runs the action. Avoids modal dialogs for pragmatic admin UX.
export function ConfirmButton({
  action,
  children,
  confirmLabel,
}: {
  action: () => Promise<void>
  children: React.ReactNode
  confirmLabel: string
}) {
  const [armed, setArmed] = useState(false)
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    if (!armed) return
    const timer = setTimeout(() => setArmed(false), 4000)
    return () => clearTimeout(timer)
  }, [armed])

  return (
    <Button
      type="button"
      size="sm"
      variant={armed ? 'destructive' : 'outline'}
      disabled={pending}
      onClick={() => {
        if (!armed) {
          setArmed(true)
          return
        }
        setArmed(false)
        startTransition(() => action())
      }}
    >
      {armed ? confirmLabel : children}
    </Button>
  )
}
