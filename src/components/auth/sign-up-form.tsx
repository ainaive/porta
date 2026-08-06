'use client'

import { useLocale, useTranslations } from 'next-intl'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { authClient } from '@/lib/auth-client'
import { hardNavigate } from '@/lib/hard-navigate'

type SignUpInput = Parameters<typeof authClient.signUp.email>[0] & {
  inviteToken?: string
}

export function SignUpForm({
  inviteToken,
  lockedEmail,
}: {
  inviteToken?: string
  lockedEmail?: string | null
}) {
  const t = useTranslations('auth')
  const locale = useLocale()
  const [pending, setPending] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setPending(true)
    const { error } = await authClient.signUp.email({
      name: String(form.get('name')),
      email: lockedEmail ?? String(form.get('email')),
      password: String(form.get('password')),
      // Extra field consumed by the server-side invite hook.
      inviteToken,
    } as SignUpInput)
    if (error) {
      setPending(false)
      toast.error(error.message ?? t('signUpFailed'))
      return
    }
    hardNavigate(`/${locale}`)
  }

  return (
    <form onSubmit={handleSubmit}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="name">{t('name')}</FieldLabel>
          <Input id="name" name="name" autoComplete="name" required />
        </Field>
        <Field>
          <FieldLabel htmlFor="email">{t('email')}</FieldLabel>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            defaultValue={lockedEmail ?? undefined}
            disabled={Boolean(lockedEmail)}
            required
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="password">{t('password')}</FieldLabel>
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
          {pending ? t('signingUp') : t('signUpAction')}
        </Button>
      </FieldGroup>
    </form>
  )
}
