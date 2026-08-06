'use client'

import { useTranslations } from 'next-intl'
import { useActionState } from 'react'
import { ActionFeedback } from '@/components/admin/action-feedback'
import { Button } from '@/components/ui/button'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import type { Locale } from '@/i18n/routing'
import { type ActionState, saveTranslation } from '@/lib/admin-actions'

export function TranslationForm({
  resourceId,
  locale,
  initial,
}: {
  resourceId: string
  locale: Locale
  initial: { title: string; summary: string; body: string } | null
}) {
  const t = useTranslations('admin')
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    saveTranslation.bind(null, resourceId, locale),
    {},
  )

  return (
    <form action={formAction}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor={`title-${locale}`}>{t('titleField')}</FieldLabel>
          <Input
            id={`title-${locale}`}
            name="title"
            defaultValue={initial?.title ?? ''}
            required
          />
        </Field>
        <Field>
          <FieldLabel htmlFor={`summary-${locale}`}>
            {t('summaryField')}
          </FieldLabel>
          <Input
            id={`summary-${locale}`}
            name="summary"
            defaultValue={initial?.summary ?? ''}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor={`body-${locale}`}>{t('bodyField')}</FieldLabel>
          <Textarea
            id={`body-${locale}`}
            name="body"
            rows={14}
            defaultValue={initial?.body ?? ''}
            className="font-mono text-sm"
          />
        </Field>
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={pending}>
            {t('save')}
          </Button>
          <ActionFeedback state={state} />
        </div>
      </FieldGroup>
    </form>
  )
}
