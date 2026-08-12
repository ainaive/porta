'use client'

import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { authClient } from '@/lib/auth-client'

export function PasswordForm() {
  const t = useTranslations('account')
  const [pending, setPending] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)
    setPending(true)
    const { error } = await authClient.changePassword({
      currentPassword: String(data.get('currentPassword')),
      newPassword: String(data.get('newPassword')),
      // Sign other sessions out — a password change should invalidate them.
      revokeOtherSessions: true,
    })
    setPending(false)
    if (error) {
      toast.error(error.message ?? t('passwordChangeFailed'))
      return
    }
    form.reset()
    toast.success(t('passwordChanged'))
  }

  return (
    <form onSubmit={handleSubmit}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="currentPassword">
            {t('currentPassword')}
          </FieldLabel>
          <Input
            id="currentPassword"
            name="currentPassword"
            type="password"
            autoComplete="current-password"
            required
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="newPassword">{t('newPassword')}</FieldLabel>
          <Input
            id="newPassword"
            name="newPassword"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
          />
        </Field>
        <Button type="submit" disabled={pending} className="w-fit">
          {t('changePassword')}
        </Button>
      </FieldGroup>
    </form>
  )
}
