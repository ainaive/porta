'use client'

import { useSearchParams } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { authClient } from '@/lib/auth-client'
import { hardNavigate } from '@/lib/hard-navigate'

export function SignInForm() {
  const t = useTranslations('auth')
  const locale = useLocale()
  const searchParams = useSearchParams()
  const [pending, setPending] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setPending(true)
    const { error } = await authClient.signIn.email({
      email: String(form.get('email')),
      password: String(form.get('password')),
    })
    if (error) {
      setPending(false)
      toast.error(error.message ?? t('signInFailed'))
      return
    }
    const next = searchParams.get('next')
    // Only same-origin paths. String checks are insufficient — URL parsing
    // strips tab/newline and treats "\" as "/", so "/\evil.com" and
    // "/<TAB>\evil.com" are both protocol-relative. Resolve exactly like
    // the browser will, require our own origin, and navigate to the
    // normalized path rather than the raw string.
    let target = `/${locale}`
    if (next) {
      try {
        const url = new URL(next, window.location.origin)
        if (url.origin === window.location.origin) {
          target = url.pathname + url.search + url.hash
        }
      } catch {
        // Unparseable → fall through to the locale root.
      }
    }
    hardNavigate(target)
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
        <Field>
          <FieldLabel htmlFor="password">{t('password')}</FieldLabel>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </Field>
        <Button type="submit" disabled={pending}>
          {pending ? t('signingIn') : t('signInAction')}
        </Button>
      </FieldGroup>
    </form>
  )
}
