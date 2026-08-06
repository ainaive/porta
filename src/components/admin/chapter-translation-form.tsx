'use client'

import { useTranslations } from 'next-intl'
import { useActionState } from 'react'
import { ActionFeedback } from '@/components/admin/action-feedback'
import { Button } from '@/components/ui/button'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import type { Locale } from '@/i18n/routing'
import { type ActionState, saveChapterTranslation } from '@/lib/admin-actions'

export function ChapterTranslationForm({
  chapterId,
  locale,
  initial,
}: {
  chapterId: string
  locale: Locale
  initial: { title: string; body: string } | null
}) {
  const t = useTranslations('admin')
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    saveChapterTranslation.bind(null, chapterId, locale),
    {},
  )

  return (
    <form action={formAction}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor={`ch-title-${locale}`}>
            {t('titleField')}
          </FieldLabel>
          <Input
            id={`ch-title-${locale}`}
            name="title"
            defaultValue={initial?.title ?? ''}
            required
          />
        </Field>
        <Field>
          <FieldLabel htmlFor={`ch-body-${locale}`}>
            {t('bodyField')}
          </FieldLabel>
          <Textarea
            id={`ch-body-${locale}`}
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
