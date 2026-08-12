'use client'

import { useLocale, useTranslations } from 'next-intl'
import { useState } from 'react'
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
    await authClient.requestPasswordReset({
      email,
      redirectTo: `${window.location.origin}/${locale}/reset-password`,
    })
    setPending(false)
    // Always the same outcome — better-auth never reveals whether the address
    // is registered, so neither do we.
    setSent(true)
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
