'use client'

import { useTranslations } from 'next-intl'
import { useActionState } from 'react'
import { ActionFeedback } from '@/components/admin/action-feedback'
import { MetaFields } from '@/components/admin/meta-fields'
import { NativeSelect } from '@/components/admin/native-select'
import { Button } from '@/components/ui/button'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import type { MetaField } from '@/core/module/define'
import { type ActionState, saveSettings } from '@/lib/admin-actions'

// Stored meta value → input string. The inverse of `parseMeta`'s field
// handling in src/lib/resource-meta.ts; keep the two in step.
function inputValue(field: MetaField, stored: unknown): string {
  if (field.kind === 'lines') {
    if (!Array.isArray(stored)) return ''
    return stored
      .map((entry) => {
        const link = entry as { label?: string; url?: string }
        return `${link.label ?? ''} | ${link.url ?? ''}`
      })
      .join('\n')
  }
  if (stored === undefined || stored === null) return ''
  return String(stored)
}

export function SettingsForm({
  resource,
  moduleId,
  metaFields,
}: {
  resource: {
    id: string
    slug: string
    status: 'draft' | 'published'
    tags: string[]
    meta: Record<string, unknown>
  }
  /** Owner of this resource's section — the namespace its labels live in. */
  moduleId: string
  metaFields: readonly MetaField[]
}) {
  const t = useTranslations('admin')
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    saveSettings.bind(null, resource.id),
    {},
  )
  // React resets the form after every action; on error the echoed submission
  // wins over the stored settings so nothing typed is lost.
  const values = state.values
  const metaValues = Object.fromEntries(
    metaFields.map((field) => [
      field.name,
      values?.[field.name] ?? inputValue(field, resource.meta[field.name]),
    ]),
  )

  return (
    <form action={formAction}>
      <FieldGroup>
        <div className="grid gap-6 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="slug">{t('slug')}</FieldLabel>
            <Input
              id="slug"
              name="slug"
              defaultValue={values?.slug ?? resource.slug}
              required
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="status">{t('status')}</FieldLabel>
            <NativeSelect
              id="status"
              name="status"
              defaultValue={values?.status ?? resource.status}
            >
              <option value="draft">{t('draft')}</option>
              <option value="published">{t('published')}</option>
            </NativeSelect>
          </Field>
        </div>
        <Field>
          <FieldLabel htmlFor="tags">{t('tags')}</FieldLabel>
          <Input
            id="tags"
            name="tags"
            defaultValue={values?.tags ?? resource.tags.join(', ')}
            placeholder={t('tagsHint')}
          />
        </Field>

        <MetaFields
          moduleId={moduleId}
          fields={metaFields}
          values={metaValues}
        />

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
