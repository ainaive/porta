'use client'

import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { authClient } from '@/lib/auth-client'

export function ProfileForm({ initialName }: { initialName: string }) {
  const t = useTranslations('account')
  const [pending, setPending] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const name = String(new FormData(event.currentTarget).get('name')).trim()
    if (!name) {
      toast.error(t('nameRequired'))
      return
    }
    setPending(true)
    try {
      const { error } = await authClient.updateUser({ name })
      if (error) {
        toast.error(error.message ?? t('saveFailed'))
        return
      }
      toast.success(t('profileSaved'))
    } catch {
      toast.error(t('saveFailed'))
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="name">{t('nameField')}</FieldLabel>
          <Input
            id="name"
            name="name"
            autoComplete="name"
            defaultValue={initialName}
            required
          />
        </Field>
        <Button type="submit" disabled={pending} className="w-fit">
          {t('save')}
        </Button>
      </FieldGroup>
    </form>
  )
}
