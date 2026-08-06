'use client'

import { useActionState } from 'react'
import { useTranslations } from 'next-intl'
import { ActionFeedback } from '@/components/admin/action-feedback'
import { NativeSelect } from '@/components/admin/native-select'
import { Button } from '@/components/ui/button'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { createResource, type ActionState } from '@/lib/admin-actions'

export function CreateResourceForm() {
  const t = useTranslations('admin')
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    createResource,
    {},
  )

  return (
    <form action={formAction} className="max-w-md">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="type">{t('type')}</FieldLabel>
          <NativeSelect id="type" name="type" defaultValue="tool">
            <option value="tool">tool</option>
            <option value="course">course</option>
            <option value="video">video</option>
            <option value="model_api">model_api</option>
          </NativeSelect>
        </Field>
        <Field>
          <FieldLabel htmlFor="slug">{t('slug')}</FieldLabel>
          <Input id="slug" name="slug" placeholder="my-resource" required />
        </Field>
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={pending}>
            {t('create')}
          </Button>
          <ActionFeedback state={state} />
        </div>
      </FieldGroup>
    </form>
  )
}
