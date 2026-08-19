'use client'

import { useTranslations } from 'next-intl'
import { useActionState } from 'react'
import { ActionFeedback } from '@/components/admin/action-feedback'
import { NativeSelect } from '@/components/admin/native-select'
import { Button } from '@/components/ui/button'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { type ActionState, createResource } from '@/lib/admin-actions'

export function CreateResourceForm({
  /** Registered section keys, in registry order. */
  types,
}: {
  types: readonly string[]
}) {
  const t = useTranslations('admin')
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    createResource,
    {},
  )
  // React resets the form after every action; on error the echoed submission
  // re-fills the fields so nothing typed is lost.
  const values = state.values

  return (
    <form action={formAction} className="max-w-md">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="type">{t('type')}</FieldLabel>
          <NativeSelect
            id="type"
            name="type"
            defaultValue={values?.type ?? types[0]}
          >
            {types.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field>
          <FieldLabel htmlFor="slug">{t('slug')}</FieldLabel>
          <Input
            id="slug"
            name="slug"
            placeholder="my-resource"
            defaultValue={values?.slug ?? ''}
            required
          />
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
