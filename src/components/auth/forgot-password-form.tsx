'use client'

import { useLocale, useTranslations } from 'next-intl'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { authClient } from '@/lib/auth-client'

export function ForgotPasswordForm() {
  const t = useTranslations('auth')
  const locale = useLocale()
  const [pending, setPending] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const email = String(new FormData(event.currentTarget).get('email'))
    setPending(true)
    try {
      const { error } = await authClient.requestPasswordReset({
        email,
        redirectTo: `${window.location.origin}/${locale}/reset-password`,
      })
      // An unknown address still returns success (better-auth never reveals
      // whether it's registered), so a returned error is a real failure —
      // surface it rather than falsely claiming the link was sent.
      if (error) {
        toast.error(t('sendFailed'))
        return
      }
      setSent(true)
    } catch {
      toast.error(t('sendFailed'))
    } finally {
      setPending(false)
    }
  }

  if (sent) {
    return (
      <p className="text-sm text-muted-foreground">{t('resetEmailSent')}</p>
    )
  }

  return (
    <form onSubmit={handleSubmit}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="email">{t('email')}</FieldLabel>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
          />
        </Field>
        <Button type="submit" disabled={pending}>
          {pending ? t('sending') : t('sendResetLink')}
        </Button>
      </FieldGroup>
    </form>
  )
}
