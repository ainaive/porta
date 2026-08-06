'use client'

import { useActionState } from 'react'
import { useTranslations } from 'next-intl'
import { ActionFeedback } from '@/components/admin/action-feedback'
import { NativeSelect } from '@/components/admin/native-select'
import { Button } from '@/components/ui/button'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { createInvite, type ActionState } from '@/lib/admin-actions'

export function InviteForm() {
  const t = useTranslations('admin')
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    createInvite,
    {},
  )

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <Field className="w-64">
        <FieldLabel htmlFor="invite-email">{t('inviteEmail')}</FieldLabel>
        <Input id="invite-email" name="email" type="email" />
      </Field>
      <Field className="w-36">
        <FieldLabel htmlFor="invite-role">{t('inviteRole')}</FieldLabel>
        <NativeSelect id="invite-role" name="role" defaultValue="member">
          <option value="member">member</option>
          <option value="admin">admin</option>
        </NativeSelect>
      </Field>
      <Button type="submit" disabled={pending}>
        {t('createInvite')}
      </Button>
      <ActionFeedback state={state} />
    </form>
  )
}
