'use client'

import { useTranslations } from 'next-intl'
import { useActionState } from 'react'
import { ActionFeedback } from '@/components/admin/action-feedback'
import { NativeSelect } from '@/components/admin/native-select'
import { Button } from '@/components/ui/button'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { type ActionState, saveSettings } from '@/lib/admin-actions'
import type {
  CourseMeta,
  ModelApiMeta,
  ResourceType,
  ToolMeta,
  VideoMeta,
} from '@/lib/resource-meta'

type Meta = Partial<ToolMeta & VideoMeta & ModelApiMeta & CourseMeta>

export function SettingsForm({
  resource,
}: {
  resource: {
    id: string
    type: ResourceType
    slug: string
    status: 'draft' | 'published'
    tags: string[]
    meta: Meta
  }
}) {
  const t = useTranslations('admin')
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    saveSettings.bind(null, resource.id),
    {},
  )
  const meta = resource.meta
  // React resets the form after every action; on error the echoed submission
  // wins over the stored settings so nothing typed is lost.
  const values = state.values

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

        {resource.type === 'tool' ? (
          <div className="grid gap-6 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="url">{t('metaUrl')}</FieldLabel>
              <Input
                id="url"
                name="url"
                defaultValue={values?.url ?? meta.url ?? ''}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="docsUrl">{t('metaDocsUrl')}</FieldLabel>
              <Input
                id="docsUrl"
                name="docsUrl"
                defaultValue={values?.docsUrl ?? meta.docsUrl ?? ''}
              />
            </Field>
          </div>
        ) : null}

        {resource.type === 'video' ? (
          <div className="grid gap-6 sm:grid-cols-3">
            <Field>
              <FieldLabel htmlFor="provider">{t('metaProvider')}</FieldLabel>
              <NativeSelect
                id="provider"
                name="provider"
                defaultValue={values?.provider ?? meta.provider ?? 'youtube'}
              >
                <option value="youtube">YouTube</option>
                <option value="bilibili">Bilibili</option>
              </NativeSelect>
            </Field>
            <Field className="sm:col-span-2">
              <FieldLabel htmlFor="embedUrl">{t('metaEmbedUrl')}</FieldLabel>
              <Input
                id="embedUrl"
                name="embedUrl"
                defaultValue={values?.embedUrl ?? meta.embedUrl ?? ''}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="duration">{t('metaDuration')}</FieldLabel>
              <Input
                id="duration"
                name="duration"
                defaultValue={values?.duration ?? meta.duration ?? ''}
                placeholder="12:34"
              />
            </Field>
          </div>
        ) : null}

        {resource.type === 'model_api' ? (
          <>
            <div className="grid gap-6 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="provider">{t('metaProvider')}</FieldLabel>
                <Input
                  id="provider"
                  name="provider"
                  defaultValue={values?.provider ?? meta.provider ?? ''}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="docsUrl">{t('metaDocsUrl')}</FieldLabel>
                <Input
                  id="docsUrl"
                  name="docsUrl"
                  defaultValue={values?.docsUrl ?? meta.docsUrl ?? ''}
                />
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="endpoint">{t('metaEndpoint')}</FieldLabel>
              <Input
                id="endpoint"
                name="endpoint"
                defaultValue={values?.endpoint ?? meta.endpoint ?? ''}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="links">{t('metaLinks')}</FieldLabel>
              <Textarea
                id="links"
                name="links"
                rows={4}
                defaultValue={
                  values?.links ??
                  (meta.links ?? [])
                    .map((link) => `${link.label} | ${link.url}`)
                    .join('\n')
                }
                className="font-mono text-sm"
              />
            </Field>
          </>
        ) : null}

        {resource.type === 'course' ? (
          <div className="grid gap-6 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="level">{t('metaLevel')}</FieldLabel>
              <NativeSelect
                id="level"
                name="level"
                defaultValue={values?.level ?? meta.level ?? ''}
              >
                <option value="">—</option>
                <option value="beginner">beginner</option>
                <option value="intermediate">intermediate</option>
                <option value="advanced">advanced</option>
              </NativeSelect>
            </Field>
            <Field>
              <FieldLabel htmlFor="estimatedHours">{t('metaHours')}</FieldLabel>
              <Input
                id="estimatedHours"
                name="estimatedHours"
                type="number"
                min="0"
                step="0.5"
                defaultValue={
                  values?.estimatedHours ?? meta.estimatedHours ?? ''
                }
              />
            </Field>
          </div>
        ) : null}

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
