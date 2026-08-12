'use client'

import { useLocale, useTranslations } from 'next-intl'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { authClient } from '@/lib/auth-client'
import { hardNavigate } from '@/lib/hard-navigate'

export function ResetPasswordForm({ token }: { token: string | null }) {
  const t = useTranslations('auth')
  const locale = useLocale()
  const [pending, setPending] = useState(false)

  // The email link bounces through /api/auth/reset-password/:token, which
  // redirects here with ?token=; without it the link is malformed or expired.
  if (!token) {
    return <p className="text-sm text-destructive">{t('resetLinkInvalid')}</p>
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const newPassword = String(
      new FormData(event.currentTarget).get('password'),
    )
    setPending(true)
    try {
      const { error } = await authClient.resetPassword({
        newPassword,
        token: token as string,
      })
      if (error) {
        toast.error(error.message ?? t('resetFailed'))
        return
      }
      toast.success(t('resetSuccess'))
      hardNavigate(`/${locale}/sign-in`)
    } catch {
      toast.error(t('resetFailed'))
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="password">{t('newPassword')}</FieldLabel>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
          />
        </Field>
        <Button type="submit" disabled={pending}>
          {pending ? t('resetting') : t('resetAction')}
        </Button>
      </FieldGroup>
    </form>
  )
}
